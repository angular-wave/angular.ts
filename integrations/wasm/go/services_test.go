package angularwasm

import "testing"

func TestBuiltInServiceTokenNames(t *testing.T) {
	tests := map[string]string{
		"rootScope":       (RootScopeService{}).TokenName(),
		"http":            (HttpService{}).TokenName(),
		"log":             (LogService{}).TokenName(),
		"exception":       (ExceptionHandlerService{}).TokenName(),
		"eventBus":        (PubSubService{}).TokenName(),
		"templateRequest": (TemplateRequestService{}).TokenName(),
		"templateCache":   (TemplateCacheService{}).TokenName(),
		"cookie":          (CookieService{}).TokenName(),
		"state":           (StateService{}).TokenName(),
		"stateRegistry":   (StateRegistryService{}).TokenName(),
		"websocket":       (WebSocketService{}).TokenName(),
		"sse":             (SseService{}).TokenName(),
		"rest":            (RestFactory{}).TokenName(),
	}

	want := map[string]string{
		"rootScope":       "$rootScope",
		"http":            "$http",
		"log":             "$log",
		"exception":       "$exceptionHandler",
		"eventBus":        "$eventBus",
		"templateRequest": "$templateRequest",
		"templateCache":   "$templateCache",
		"cookie":          "$cookie",
		"state":           "$state",
		"stateRegistry":   "$stateRegistry",
		"websocket":       "$websocket",
		"sse":             "$sse",
		"rest":            "$rest",
	}

	for name, got := range tests {
		if got != want[name] {
			t.Fatalf("%s token mismatch: want %s got %s", name, want[name], got)
		}
	}
}

func TestHTTPRequestFacadesPreserveOptions(t *testing.T) {
	credentials := true
	config := GetRequest("/api/todos")
	config.RequestShortcutConfig = NewRequestShortcutConfig().
		WithHeader("Accept", "application/json").
		WithParam("owner", "Go").
		WithTimeout(1500).
		WithResponseType("json").
		WithCredentials(credentials)

	if config.Method != HttpGet || config.URL != "/api/todos" {
		t.Fatalf("unexpected request config: %#v", config)
	}
	if config.Headers["Accept"] != "application/json" {
		t.Fatalf("unexpected headers: %#v", config.Headers)
	}
	if config.Params["owner"] != "Go" {
		t.Fatalf("unexpected params: %#v", config.Params)
	}
	if config.TimeoutMS != 1500 || config.ResponseType != "json" {
		t.Fatalf("unexpected shortcut config: %#v", config.RequestShortcutConfig)
	}
	if config.Credentials == nil || !*config.Credentials {
		t.Fatalf("expected credentials flag")
	}

	response := HttpResponse[string]{
		Data:       "ok",
		Status:     200,
		StatusText: "OK",
		XHRStatus:  HttpComplete,
	}
	if response.Data != "ok" || response.XHRStatus != HttpComplete {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestDiagnosticsAndPersistenceFacadesPreserveMetadata(t *testing.T) {
	event := ScopeEvent{Name: "save", DefaultPrevented: true}
	invocation := InvocationDetail{
		Expression: "save(todo)",
		Arguments:  []any{"todo-1"},
	}
	cookie := CookieOptions{
		Path:     "/",
		Domain:   "example.test",
		Expires:  "2030-01-01T00:00:00Z",
		Secure:   true,
		SameSite: CookieSameSiteStrict,
	}
	store := CookieStoreOptions{Cookie: cookie}

	if event.Name != "save" || !event.DefaultPrevented {
		t.Fatalf("unexpected scope event: %#v", event)
	}
	if invocation.Expression != "save(todo)" || len(invocation.Arguments) != 1 {
		t.Fatalf("unexpected invocation detail: %#v", invocation)
	}
	if store.Cookie.SameSite != CookieSameSiteStrict || StorageLocal != "local" {
		t.Fatalf("unexpected persistence metadata: %#v", store)
	}
}

func TestRouterFacadesPreserveStateMetadata(t *testing.T) {
	state := NewStateDeclaration("todos.detail").
		WithURL("/todos/:id").
		WithComponent("TodoDetail").
		WithTemplateURL("/templates/todo-detail.html")
	resolve := NewStateResolve("todo").
		WithDep("TodoStore").
		WithDep("$transition$").
		WithEager(true)
	resolves := StateResolveArray{resolve}

	if state.Name != "todos.detail" || state.URL != "/todos/:id" {
		t.Fatalf("unexpected state: %#v", state)
	}
	if state.Component != "TodoDetail" || state.TemplateURL != "/templates/todo-detail.html" {
		t.Fatalf("unexpected view metadata: %#v", state)
	}
	if resolves[0].Token != "todo" || len(resolves[0].Deps) != 2 || !resolves[0].Eager {
		t.Fatalf("unexpected resolves: %#v", resolves)
	}
}

func TestRealtimeFacadesPreserveTransportOptions(t *testing.T) {
	connection := NewConnectionConfig().
		WithRetryDelay(250).
		WithMaxRetries(5).
		WithHeartbeatTimeout(5000).
		WithEventType("notice")
	websocket := NewWebSocketConfig().
		WithConnection(connection).
		WithProtocol("json.v1")
	sse := NewSseConfig().
		WithConnection(connection).
		WithCredentialsValue(true).
		WithParam("room", "main")
	message := RealtimeProtocolMessage{
		HTML:   "<li>Saved</li>",
		Target: "#feed",
		Swap:   SwapBeforeEnd,
	}

	if connection.RetryDelayMS != 250 || connection.MaxRetries != 5 || connection.HeartbeatTimeoutMS != 5000 {
		t.Fatalf("unexpected connection config: %#v", connection)
	}
	if len(websocket.Protocols) != 1 || websocket.Protocols[0] != "json.v1" {
		t.Fatalf("unexpected websocket config: %#v", websocket)
	}
	if !sse.WithCredentials || sse.Params["room"] != "main" {
		t.Fatalf("unexpected sse config: %#v", sse)
	}
	if message.Swap != SwapBeforeEnd || message.Target != "#feed" {
		t.Fatalf("unexpected realtime message: %#v", message)
	}
}

func TestRestFacadesPreserveRequestAndResponseMetadata(t *testing.T) {
	definition := RestDefinition{Name: "todos", URL: "/api/todos"}
	request := RestRequest{
		Method:        HttpGet,
		URL:           "/api/todos/1",
		CollectionURL: "/api/todos",
		ID:            "1",
		Params:        map[string]any{"include": "comments"},
		Options:       RestOptions{"cache": "network-first"},
	}
	response := RestResponse[string]{
		Data:   "ok",
		Source: "network",
	}

	if definition.Name != "todos" || definition.URL != "/api/todos" {
		t.Fatalf("unexpected rest definition: %#v", definition)
	}
	if request.Method != HttpGet || request.Options["cache"] != "network-first" {
		t.Fatalf("unexpected rest request: %#v", request)
	}
	if response.Data != "ok" || response.Source != "network" || response.Stale {
		t.Fatalf("unexpected rest response: %#v", response)
	}
}
