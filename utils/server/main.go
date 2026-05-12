package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"embed"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"html"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
	"golang.org/x/net/websocket"
)

const (
	httpAddr        = ":3000"
	webTransportURL = "https://localhost:4433/webtransport"
)

//go:embed templates/native/*.html
var serverTemplates embed.FS

type task struct {
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Owner  string `json:"owner"`
	Status string `json:"status"`
}

type taskStore struct {
	mu     sync.Mutex
	tasks  []task
	nextID int
}

var initialTasks = []task{
	{ID: 1, Title: "Write API notes", Owner: "Ada", Status: "Open"},
	{ID: 2, Title: "Review cache policy", Owner: "Lin", Status: "Open"},
	{ID: 3, Title: "Ship REST demo", Owner: "Grace", Status: "Done"},
}

var webTransportCloseOnce sync.Map
var webTransportAvailable atomic.Bool

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cert, certHash, err := generateLocalCertificate()
	if err != nil {
		log.Fatal(err)
	}

	httpServer := &http.Server{
		Addr:              httpAddr,
		Handler:           withCORS(newHTTPMux(certHash)),
		ReadHeaderTimeout: 5 * time.Second,
	}

	wtServer := newWebTransportServer(cert)

	go func() {
		log.Printf("HTTP test backend listening on http://localhost%s", httpAddr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	go func() {
		log.Printf("WebTransport test backend listening on %s", webTransportURL)
		webTransportAvailable.Store(true)
		if err := wtServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			webTransportAvailable.Store(false)
			log.Printf("WebTransport server unavailable: %v", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_ = httpServer.Shutdown(shutdownCtx)
	_ = wtServer.Close()
}

func newHTTPMux(certHash []byte) *http.ServeMux {
	mux := http.NewServeMux()
	tasks := &taskStore{}
	tasks.reset()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/":
			writeText(w, http.StatusOK, "Hello")
		case r.URL.Path == "/post" && r.Method == http.MethodPost:
			writeJSON(w, http.StatusOK, readJSONValue(r))
		case r.URL.Path == "/invalidarray" && r.Method == http.MethodPost:
			writeJSON(w, http.StatusOK, "{1, 2, 3]")
		case r.URL.Path == "/nocontent" && r.Method == http.MethodPost:
			writeJSONNoContentType(w, http.StatusOK, readJSONValue(r))
		case r.URL.Path == "/form" && r.Method == http.MethodPost:
			writeText(w, http.StatusOK, "")
		case r.URL.Path == "/json" && r.Method == http.MethodPost:
			writeJSON(w, http.StatusOK, readFormOrJSONBody(r))
		case r.URL.Path == "/jsonobject" && r.Method == http.MethodGet:
			writeJSON(w, http.StatusOK, map[string]any{"name": "Bob", "age": 20})
		case r.URL.Path == "/hello" && r.Method == http.MethodPost:
			writeHTML(w, http.StatusOK, "<div>Hello</div>")
		case r.URL.Path == "/blob" && r.Method == http.MethodPost:
			writeText(w, http.StatusOK, "")
		case r.URL.Path == "/head" && r.Method == http.MethodHead:
			w.WriteHeader(http.StatusOK)
		case r.URL.Path == "/delete" && r.Method == http.MethodDelete:
			body, _ := io.ReadAll(r.Body)
			writeText(w, http.StatusOK, string(body))
		case r.URL.Path == "/put" && r.Method == http.MethodPut:
			writeJSON(w, http.StatusOK, "Hello")
		case r.URL.Path == "/patch" && r.Method == http.MethodPatch:
			writeJSON(w, http.StatusOK, "Hello")
		case r.URL.Path == "/interpolation":
			writeText(w, http.StatusOK, "{{expr}}")
		case r.URL.Path == "/jsoninterpolation":
			writeJSON(w, http.StatusOK, "{{expr}}")
		case r.URL.Path == "/now":
			writeText(w, http.StatusOK, strconv.FormatInt(time.Now().UnixMilli(), 10))
		case r.URL.Path == "/scopeinit":
			writeHTML(w, http.StatusOK, `<div ng-init="name=1"></div>`)
		case r.URL.Path == "/directive":
			writeHTML(w, http.StatusOK, "<div><div test></div></div>")
		case r.URL.Path == "/empty":
			writeText(w, http.StatusOK, " ")
		case r.URL.Path == "/hello":
			writeText(w, http.StatusOK, "Hello")
		case r.URL.Path == "/div":
			writeHTML(w, http.StatusOK, "<div>Hello</div>")
		case r.URL.Path == "/stream-html":
			streamHTML(w)
		case r.URL.Path == "/http-stream-demo":
			httpStreamDemo(w)
		case r.URL.Path == "/div-animate":
			writeHTML(w, http.StatusOK, fmt.Sprintf("<div class='animate'>Hello %d</div>", time.Now().UnixMilli()))
		case r.URL.Path == "/divexpr":
			writeHTML(w, http.StatusOK, "<div>{{expr}}</div>")
		case r.URL.Path == "/divctrlexpr":
			writeHTML(w, http.StatusOK, "<div>{{$ctrl.expr}}</div>")
		case r.URL.Path == "/template.html":
			writeHTML(w, http.StatusOK, "<p>template.html</p>")
		case r.URL.Path == "/circle-svg":
			writeText(w, http.StatusOK, "<circle></circle>")
		case r.URL.Path == "/hello2":
			writeText(w, http.StatusOK, "Hello2")
		case r.URL.Path == "/include":
			writeHTML(w, http.StatusOK, `<div ng-include="'/mock/hello'"></div>`)
		case r.URL.Path == "/third":
			writeHTML(w, http.StatusOK, "<div third>{{1+2}}</div>")
		case r.URL.Path == "/script":
			writeHTML(w, http.StatusOK, "<div><script>window.SCRIPT_RAN = true;</script></div>")
		case r.URL.Path == "/401":
			writeTextStatus(w, http.StatusUnauthorized, "Unauthorized")
		case r.URL.Path == "/404":
			writeTextStatus(w, http.StatusNotFound, "Not Found")
		case r.URL.Path == "/422":
			writeTextStatus(w, http.StatusUnprocessableEntity, "Invalid data")
		case r.URL.Path == "/never":
			<-r.Context().Done()
		case r.URL.Path == "/my-rect.html":
			writeHTML(w, http.StatusOK, `<g ng-include="'/mock/include.svg'"></g>`)
		case r.URL.Path == "/my-rect2.html":
			writeHTML(w, http.StatusOK, `<g ng-include="'/mock/include.svg'"><a></a></g>`)
		case r.URL.Path == "/include.svg":
			writeText(w, http.StatusOK, "<rect></rect><rect></rect>")
		case r.URL.Path == "/my-messages":
			writeHTML(w, http.StatusOK, `<div ng-message="required">You did not enter a value</div>`)
		case r.URL.Path == "/posthtml" && r.Method == http.MethodPost:
			form := readFormOrJSONBody(r)
			writeHTML(w, http.StatusOK, fmt.Sprintf("<div>%s</div>", html.EscapeString(fmt.Sprint(form["name"]))))
		case r.URL.Path == "/posterror" && r.Method == http.MethodPost:
			writeTextStatus(w, http.StatusUnprocessableEntity, "<div>Error</div>")
		case r.URL.Path == "/urlencoded" && r.Method == http.MethodPost:
			_ = r.ParseForm()
			writeText(w, http.StatusOK, "Form data: "+r.FormValue("name"))
		case r.URL.Path == "/events":
			events(w, r)
		case r.URL.Path == "/sse-protocol":
			sseProtocol(w, r)
		case r.URL.Path == "/sse-protocol-data":
			sseProtocolData(w, r)
		case r.URL.Path == "/sse-once":
			sseOnce(w, r)
		case r.URL.Path == "/sse-custom":
			sseCustom(w, r)
		case r.URL.Path == "/sse-demo":
			sseDemo(w, r)
		case r.URL.Path == "/native/websocket":
			websocket.Handler(nativeWebSocket).ServeHTTP(w, r)
		case strings.HasPrefix(r.URL.Path, "/native/demo"):
			nativeDemoRoute(w, r)
		case r.URL.Path == "/native/views/shell":
			nativeShellView(w)
		case r.URL.Path == "/eventsoject":
			eventsObject(w, r)
		case r.URL.Path == "/subscribe":
			subscribe(w, r)
		case r.URL.Path == "/publish" && r.Method == http.MethodPost:
			publish(w, r)
		case r.URL.Path == "/api/tasks/reset" && r.Method == http.MethodPost:
			writeJSON(w, http.StatusOK, map[string]any{"data": tasks.reset()})
		case r.URL.Path == "/api/tasks" && r.Method == http.MethodGet:
			writeJSON(w, http.StatusOK, tasks.list())
		case r.URL.Path == "/api/tasks" && r.Method == http.MethodPost:
			writeJSON(w, http.StatusCreated, tasks.create(readJSONBody(r)))
		case strings.HasPrefix(r.URL.Path, "/api/tasks/"):
			tasks.handleItem(w, r)
		case strings.TrimSuffix(r.URL.Path, "/") == "/users":
			writeJSON(w, http.StatusOK, []map[string]any{{"id": 1, "name": "Bob"}, {"id": 2, "name": "Ken"}})
		case r.URL.Path == "/webtransport/cert-hash":
			if !webTransportAvailable.Load() {
				http.Error(w, "WebTransport test backend unavailable", http.StatusServiceUnavailable)

				return
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"url":       webTransportURL,
				"algorithm": "sha-256",
				"value":     base64.StdEncoding.EncodeToString(certHash),
			})
		default:
			http.NotFound(w, r)
		}
	})

	return mux
}

func newWebTransportServer(cert tls.Certificate) *webtransport.Server {
	mux := http.NewServeMux()
	server := &webtransport.Server{
		H3: &http3.Server{
			Addr: ":4433",
			TLSConfig: http3.ConfigureTLSConfig(&tls.Config{
				Certificates: []tls.Certificate{cert},
				MinVersion:   tls.VersionTLS13,
			}),
			Handler: mux,
		},
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	webtransport.ConfigureHTTP3Server(server.H3)

	mux.HandleFunc("/webtransport", func(w http.ResponseWriter, r *http.Request) {
		session, err := server.Upgrade(w, r)
		if err != nil {
			log.Printf("webtransport upgrade failed: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		go handleWebTransportSession(session, r)
	})

	return server
}

func handleWebTransportSession(session *webtransport.Session, r *http.Request) {
	if r.URL.Query().Get("welcome") == "stream" {
		message := r.URL.Query().Get("message")
		if message == "" {
			message = `{"type":"welcome"}`
		}
		go sendWebTransportStream(session, message)
	}

	if r.URL.Query().Get("welcome") == "datagram" {
		message := r.URL.Query().Get("message")
		if message == "" {
			message = `{"type":"welcome"}`
		}
		go func() {
			_ = session.SendDatagram([]byte(message))
		}()
	}

	if shouldCloseWebTransportSession(r) {
		go func() {
			time.Sleep(25 * time.Millisecond)
			_ = session.CloseWithError(webtransport.SessionErrorCode(1), "test close")
		}()
	}

	go func() {
		for {
			data, err := session.ReceiveDatagram(context.Background())
			if err != nil {
				return
			}
			_ = session.SendDatagram(data)
		}
	}()

	go func() {
		for {
			stream, err := session.AcceptStream(context.Background())
			if err != nil {
				return
			}
			go func() {
				data, err := io.ReadAll(stream)
				if err == nil {
					_, _ = stream.Write([]byte("bidi:" + string(data)))
				}
				_ = stream.Close()
			}()
		}
	}()

	go func() {
		for {
			stream, err := session.AcceptUniStream(context.Background())
			if err != nil {
				return
			}
			go func() {
				data, err := io.ReadAll(stream)
				if err == nil {
					_ = session.SendDatagram([]byte("uni:" + string(data)))
				}
			}()
		}
	}()
}

func shouldCloseWebTransportSession(r *http.Request) bool {
	closeMode := r.URL.Query().Get("close")

	if closeMode == "after-open" {
		return true
	}

	if closeMode != "once" {
		return false
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		token = r.RemoteAddr
	}

	_, loaded := webTransportCloseOnce.LoadOrStore(token, true)

	return !loaded
}

func sendWebTransportStream(session *webtransport.Session, message string) {
	stream, err := session.OpenUniStreamSync(context.Background())
	if err != nil {
		return
	}
	_, _ = stream.Write([]byte(message))
	_ = stream.Close()
}

func generateLocalCertificate() (tls.Certificate, []byte, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, nil, err
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return tls.Certificate{}, nil, err
	}

	notBefore := time.Now().Add(-time.Minute)
	template := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			CommonName: "localhost",
		},
		NotBefore:             notBefore,
		NotAfter:              notBefore.Add(7 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames:              []string{"localhost"},
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
	}

	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return tls.Certificate{}, nil, err
	}

	key, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return tls.Certificate{}, nil, err
	}

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: key})
	cert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	hash := sha256.Sum256(der)

	return cert, hash[:], nil
}

func (s *taskStore) reset() []task {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tasks = make([]task, len(initialTasks))
	copy(s.tasks, initialTasks)
	s.nextID = 4

	return append([]task(nil), s.tasks...)
}

func (s *taskStore) list() []task {
	s.mu.Lock()
	defer s.mu.Unlock()

	return append([]task(nil), s.tasks...)
}

func (s *taskStore) create(body map[string]any) task {
	s.mu.Lock()
	defer s.mu.Unlock()

	item := task{
		ID:     s.nextID,
		Title:  fmt.Sprint(body["title"]),
		Owner:  fmt.Sprint(body["owner"]),
		Status: "Open",
	}
	if status, ok := body["status"].(string); ok && status != "" {
		item.Status = status
	}
	s.nextID++
	s.tasks = append([]task{item}, s.tasks...)

	return item
}

func (s *taskStore) handleItem(w http.ResponseWriter, r *http.Request) {
	idText := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	id, err := strconv.Atoi(idText)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	switch r.Method {
	case http.MethodGet:
		if item, ok := s.get(id); ok {
			writeJSON(w, http.StatusOK, item)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	case http.MethodPut:
		if item, ok := s.update(id, readJSONBody(r)); ok {
			writeJSON(w, http.StatusOK, item)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	case http.MethodDelete:
		if s.delete(id) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *taskStore) get(id int) (task, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, item := range s.tasks {
		if item.ID == id {
			return item, true
		}
	}
	return task{}, false
}

func (s *taskStore) update(id int, body map[string]any) (task, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index, item := range s.tasks {
		if item.ID != id {
			continue
		}
		if title, ok := body["title"].(string); ok {
			item.Title = title
		}
		if owner, ok := body["owner"].(string); ok {
			item.Owner = owner
		}
		if status, ok := body["status"].(string); ok {
			item.Status = status
		}
		s.tasks[index] = item
		return item, true
	}
	return task{}, false
}

func (s *taskStore) delete(id int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	next := s.tasks[:0]
	removed := false
	for _, item := range s.tasks {
		if item.ID == id {
			removed = true
			continue
		}
		next = append(next, item)
	}
	s.tasks = next
	return removed
}

func streamHTML(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	flusher, _ := w.(http.Flusher)
	_, _ = w.Write([]byte("<span>{{first}}</span>"))
	flusher.Flush()
	time.Sleep(25 * time.Millisecond)
	_, _ = w.Write([]byte("<span>{{second}}</span>"))
	flusher.Flush()
}

func httpStreamDemo(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	flusher, _ := w.(http.Flusher)
	chunks := []string{
		`<article class="chunk-card"><b>Chunk 1</b><span>Connected to fetch stream</span></article>`,
		`<article class="chunk-card"><b>Chunk 2</b><span>Compiled at {{ timestamp }}</span></article>`,
		`<article class="chunk-card"><b>Chunk 3</b><span>Template expression: {{ message }}</span></article>`,
	}
	for index, chunk := range chunks {
		if index > 0 {
			time.Sleep(700 * time.Millisecond)
		}
		_, _ = w.Write([]byte(chunk))
		flusher.Flush()
	}
}

func events(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	writeSSE(w, "message", "Connected to SSE stream")
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case t := <-ticker.C:
			writeSSE(w, "message", t.Format("15:04:05"))
		}
	}
}

func sseProtocol(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	writeSSEJSON(w, "message", map[string]any{"target": "#feed", "swap": "beforeend", "html": "<p>Feed</p>"})
	time.Sleep(25 * time.Millisecond)
	writeSSEJSON(w, "message", map[string]any{"target": "#side", "swap": "innerHTML", "html": "<p>Side</p>"})
	heartbeat(w, r, time.Second)
}

func sseProtocolData(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	writeSSEJSON(w, "message", map[string]any{"target": "#feed", "swap": "beforeend", "data": "<p>Data fallback</p>"})
	heartbeat(w, r, time.Second)
}

func sseOnce(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	writeSSE(w, "message", "<p>Raw message</p>")
	heartbeat(w, r, time.Second)
}

func sseCustom(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	writeSSEJSON(w, "notice", map[string]any{"target": "#feed", "swap": "beforeend", "html": "<p>Notice</p>"})
	heartbeat(w, r, time.Second)
}

func sseDemo(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	ticker := time.NewTicker(1500 * time.Millisecond)
	defer ticker.Stop()
	count := 0
	send := func() {
		count++
		writeSSEJSON(w, "message", map[string]any{
			"target": "#sse-feed",
			"swap":   "afterbegin",
			"html":   fmt.Sprintf(`<article class="event-card"><strong>Update %d</strong><span>%s</span></article>`, count, time.Now().Format("15:04:05")),
		})
		writeSSEJSON(w, "stats", map[string]any{
			"target": "#sse-stats",
			"swap":   "innerHTML",
			"html":   fmt.Sprintf("<b>%d</b> streamed update%s", count, map[bool]string{true: "", false: "s"}[count == 1]),
		})
	}
	send()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			send()
		}
	}
}

func nativeDemoRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/native/demo")
	if path == "" || path == "/" {
		writeHTMLTemplate(w, http.StatusOK, "home.html", nil)

		return
	}

	switch {
		case path == "/shell":
			nativeShellView(w)
		case path == "/projects":
			writeHTMLTemplate(w, http.StatusOK, "projects.html", nil)
		case path == "/native-card":
			writeHTMLTemplate(w, http.StatusOK, "native-card.html", nil)
		case path == "/settings":
			writeHTMLTemplate(w, http.StatusOK, "settings.html", nil)
		case path == "/one":
			writeHTMLTemplate(w, http.StatusOK, "one.html", map[string]string{
				"RENDERED_AT": time.Now().Format(time.RFC1123),
			})
	case path == "/two":
		message := "This screen was pushed onto the navigation stack through an advance action."
		if r.URL.Query().Get("action") == "replace" {
			message = "This screen was loaded with a replace action. Going back now returns to the previous stable screen."
		}
		writeHTMLTemplate(w, http.StatusOK, "two.html", map[string]string{
			"ACTION_MESSAGE": html.EscapeString(message),
		})
	case path == "/long":
		writeHTMLTemplate(w, http.StatusOK, "long.html", nil)
	case path == "/scroll":
		writeHTMLTemplate(w, http.StatusOK, "scroll.html", nil)
	case path == "/follow":
		http.Redirect(w, r, "/native/demo/redirected", http.StatusFound)
	case path == "/redirected":
		writeHTMLTemplate(w, http.StatusOK, "redirected.html", nil)
	case path == "/reference":
		writeHTMLTemplate(w, http.StatusOK, "reference.html", nil)
	case path == "/files":
		writeHTMLTemplate(w, http.StatusOK, "files.html", nil)
	case path == "/new" && r.Method == http.MethodGet:
		writeHTMLTemplate(w, http.StatusOK, "new.html", nil)
	case path == "/new" && r.Method == http.MethodPost:
		writeHTMLTemplate(w, http.StatusOK, "success.html", nil)
	case path == "/strada-form" && r.Method == http.MethodGet:
		writeHTMLTemplate(w, http.StatusOK, "strada-form.html", nil)
	case path == "/strada-form" && r.Method == http.MethodPost:
		time.Sleep(1500 * time.Millisecond)
		writeHTMLTemplate(w, http.StatusOK, "success.html", nil)
	case path == "/strada-menu":
		writeHTMLTemplate(w, http.StatusOK, "strada-menu.html", nil)
	case path == "/strada-overflow":
		writeHTMLTemplate(w, http.StatusOK, "strada-overflow.html", nil)
	case path == "/success":
		writeHTMLTemplate(w, http.StatusOK, "success.html", nil)
	case path == "/numbers":
		writeHTMLTemplate(w, http.StatusOK, "numbers.html", nil)
	case path == "/server-card":
		writeHTMLTemplate(w, http.StatusOK, "server-card.html", map[string]string{
			"RENDERED_AT": time.Now().Format(time.RFC3339),
		})
	case path == "/drawer-card":
		writeHTMLTemplate(w, http.StatusOK, "drawer-card.html", map[string]string{
			"RENDERED_AT": time.Now().Format(time.RFC3339),
		})
	case path == "/protected":
		if nativeAuthenticated(r) {
			writeHTMLTemplate(w, http.StatusOK, "protected.html", nil)
		} else {
			writeHTMLTemplate(w, http.StatusUnauthorized, "unauthorized.html", nil)
		}
	case path == "/signin" && r.Method == http.MethodGet:
		writeHTMLTemplate(w, http.StatusOK, "signin.html", nil)
	case path == "/signin" && r.Method == http.MethodPost:
		form := readFormOrJSONBody(r)
		name := strings.TrimSpace(fmt.Sprint(form["name"]))
		if name == "" {
			name = "Native user"
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "native_authenticated",
			Value:    name,
			Path:     "/native/demo",
			Expires:  time.Now().Add(24 * time.Hour),
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
		writeHTMLTemplate(w, http.StatusOK, "home.html", nil)
	case path == "/signout" && r.Method == http.MethodPost:
		http.SetCookie(w, &http.Cookie{
			Name:     "native_authenticated",
			Value:    "",
			Path:     "/native/demo",
			Expires:  time.Unix(0, 0),
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
		writeHTMLTemplate(w, http.StatusOK, "home.html", nil)
	case path == "/slow":
		time.Sleep(3 * time.Second)
		writeHTMLTemplate(w, http.StatusOK, "slow.html", map[string]string{
			"RENDERED_AT": time.Now().Format(time.RFC1123),
		})
	case path == "/reference/turbo-drive":
		writeHTMLTemplate(w, http.StatusOK, "reference-drive.html", nil)
	case path == "/reference/turbo-frames":
		writeHTMLTemplate(w, http.StatusOK, "reference-frames.html", nil)
	case path == "/reference/turbo-streams":
		writeHTMLTemplate(w, http.StatusOK, "reference-streams.html", nil)
	case path == "/reference/turbo-native":
		writeHTMLTemplate(w, http.StatusOK, "reference-native.html", nil)
	case path == "/reference.json":
		nativeReferenceJSON(w)
	case path == "/nonexistent":
		writeHTMLTemplate(w, http.StatusNotFound, "not-found.html", nil)
	default:
		http.NotFound(w, r)
	}
}

func nativeShellView(w http.ResponseWriter) {
	writeHTMLTemplate(w, http.StatusOK, "shell.html", nil)
}

func nativeAuthenticated(r *http.Request) bool {
	cookie, err := r.Cookie("native_authenticated")

	return err == nil && cookie.Value != ""
}

func nativeReferenceJSON(w http.ResponseWriter) {
	writeJSON(w, http.StatusOK, map[string]any{
		"subtitle": "Reference",
		"items": []map[string]any{
			{
				"id":          1,
				"title":       "AngularTS Router",
				"description": "Server-rendered fragments are fetched, compiled, and swapped without replacing the native shell.",
				"path":        "/native/demo/reference/turbo-drive",
			},
			{
				"id":          2,
				"title":       "Backend Views",
				"description": "Every screen in this demo is emitted by the Go backend and enhanced by AngularTS.",
				"path":        "/native/demo/reference/turbo-frames",
			},
			{
				"id":          3,
				"title":       "Realtime Swaps",
				"description": "Native calls, SSE, HTTP, and WebTransport can share the same HTML swap protocol.",
				"path":        "/native/demo/reference/turbo-streams",
			},
			{
				"id":          4,
				"title":       "AngularTS Native",
				"description": "A forked native shell can expose platform components through the generic $native bridge.",
				"path":        "/native/demo/reference/turbo-native",
			},
		},
	})
}

func nativeWebSocket(ws *websocket.Conn) {
	defer ws.Close()

	count := 0
	for {
		var payload string
		if err := websocket.Message.Receive(ws, &payload); err != nil {
			return
		}

		count++
		var message map[string]any
		if err := json.Unmarshal([]byte(payload), &message); err != nil {
			message = map[string]any{"text": payload}
		}

		reply := map[string]any{
			"channel": "websocket",
			"count":   count,
			"text":    fmt.Sprintf("Echo %d: %v", count, message["text"]),
			"time":    time.Now().Format("15:04:05"),
		}
		data, _ := json.Marshal(reply)
		if err := websocket.Message.Send(ws, string(data)); err != nil {
			return
		}
	}
}

func eventsObject(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case t := <-ticker.C:
			writeSSEJSON(w, "message", map[string]string{"time": t.Format("15:04:05")})
		}
	}
}

var (
	subscribeMu sync.Mutex
	subscriber  http.ResponseWriter
)

func subscribe(w http.ResponseWriter, r *http.Request) {
	sseHeaders(w)
	subscribeMu.Lock()
	subscriber = w
	subscribeMu.Unlock()
	heartbeat(w, r, 2*time.Second)
}

func publish(w http.ResponseWriter, r *http.Request) {
	body := readJSONBody(r)
	text, ok := body["text"].(string)
	if !ok || text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing 'text' field"})
		return
	}
	data := map[string]string{"text": text, "time": time.Now().Format(time.RFC3339Nano)}
	subscribeMu.Lock()
	if subscriber != nil {
		writeSSEJSON(subscriber, "message", data)
	}
	subscribeMu.Unlock()
	writeJSON(w, http.StatusOK, map[string]string{"status": "Message sent to SSE client"})
}

func heartbeat(w http.ResponseWriter, r *http.Request, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			_, _ = w.Write([]byte(": heartbeat\n\n"))
			flush(w)
		}
	}
}

func sseHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flush(w)
}

func writeSSEJSON(w http.ResponseWriter, event string, value any) {
	data, _ := json.Marshal(value)
	writeSSE(w, event, string(data))
}

func writeSSE(w http.ResponseWriter, event string, data string) {
	if event != "" && event != "message" {
		_, _ = fmt.Fprintf(w, "event: %s\n", event)
	}
	for _, line := range strings.Split(data, "\n") {
		_, _ = fmt.Fprintf(w, "data: %s\n", line)
	}
	_, _ = w.Write([]byte("\n"))
	flush(w)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	data, _ := json.Marshal(value)
	_, _ = w.Write(data)
}

func writeJSONNoContentType(w http.ResponseWriter, status int, value any) {
	w.WriteHeader(status)
	data, _ := json.Marshal(value)
	_, _ = w.Write(data)
}

func writeHTML(w http.ResponseWriter, status int, value string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(value))
}

func writeHTMLTemplate(w http.ResponseWriter, status int, name string, values map[string]string) {
	content, err := serverTemplates.ReadFile("templates/native/" + name)
	if err != nil {
		http.Error(w, "Template not found", http.StatusInternalServerError)

		return
	}

	htmlFragment := string(content)
	for key, value := range values {
		htmlFragment = strings.ReplaceAll(htmlFragment, "%%"+key+"%%", value)
	}

	writeHTML(w, status, htmlFragment)
}

func writeText(w http.ResponseWriter, status int, value string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(value))
}

func writeTextStatus(w http.ResponseWriter, status int, value string) {
	w.WriteHeader(status)
	_, _ = w.Write([]byte(value))
}

func readJSONBody(r *http.Request) map[string]any {
	var value map[string]any
	if err := json.NewDecoder(r.Body).Decode(&value); err != nil {
		return map[string]any{}
	}
	return value
}

func readJSONValue(r *http.Request) any {
	var value any
	if err := json.NewDecoder(r.Body).Decode(&value); err != nil {
		return map[string]any{}
	}
	return value
}

func readFormOrJSONBody(r *http.Request) map[string]any {
	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		return readJSONBody(r)
	}
	_ = r.ParseForm()
	value := map[string]any{}
	for key, entries := range r.Form {
		if len(entries) > 0 {
			value[key] = entries[0]
		}
	}
	return value
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
			writeJSON(w, http.StatusOK, map[string]any{})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func flush(w http.ResponseWriter) {
	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}
}
