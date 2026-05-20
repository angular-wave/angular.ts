package angularwasm

// HttpMethod is an AngularTS HTTP verb.
type HttpMethod string

const (
	HttpGet     HttpMethod = "GET"
	HttpPost    HttpMethod = "POST"
	HttpPut     HttpMethod = "PUT"
	HttpDelete  HttpMethod = "DELETE"
	HttpPatch   HttpMethod = "PATCH"
	HttpHead    HttpMethod = "HEAD"
	HttpOptions HttpMethod = "OPTIONS"
)

// HttpResponseStatus is the final AngularTS HTTP transport status.
type HttpResponseStatus string

const (
	HttpComplete HttpResponseStatus = "complete"
	HttpError    HttpResponseStatus = "error"
	HttpTimeout  HttpResponseStatus = "timeout"
	HttpAbort    HttpResponseStatus = "abort"
)

// RequestShortcutConfig captures options accepted by AngularTS HTTP shortcut methods.
type RequestShortcutConfig struct {
	Headers      map[string]string
	Params       map[string]string
	TimeoutMS    int
	ResponseType string
	Credentials  *bool
}

// NewRequestShortcutConfig creates empty HTTP shortcut options.
func NewRequestShortcutConfig() RequestShortcutConfig {
	return RequestShortcutConfig{}
}

// WithHeader sets one request header.
func (c RequestShortcutConfig) WithHeader(name string, value string) RequestShortcutConfig {
	if c.Headers == nil {
		c.Headers = map[string]string{}
	}
	c.Headers[name] = value
	return c
}

// WithParam sets one query parameter.
func (c RequestShortcutConfig) WithParam(name string, value string) RequestShortcutConfig {
	if c.Params == nil {
		c.Params = map[string]string{}
	}
	c.Params[name] = value
	return c
}

// WithTimeout sets a millisecond request timeout.
func (c RequestShortcutConfig) WithTimeout(timeoutMS int) RequestShortcutConfig {
	c.TimeoutMS = timeoutMS
	return c
}

// WithResponseType sets the response body reader hint.
func (c RequestShortcutConfig) WithResponseType(responseType string) RequestShortcutConfig {
	c.ResponseType = responseType
	return c
}

// WithCredentials sets whether cross-site requests include credentials.
func (c RequestShortcutConfig) WithCredentials(withCredentials bool) RequestShortcutConfig {
	c.Credentials = &withCredentials
	return c
}

// RequestConfig is a minimal AngularTS $http request config.
type RequestConfig struct {
	Method HttpMethod
	URL    string
	RequestShortcutConfig
}

// NewRequestConfig creates a request config for method and URL.
func NewRequestConfig(method HttpMethod, url string) RequestConfig {
	return RequestConfig{Method: method, URL: url}
}

// GetRequest creates a GET request config.
func GetRequest(url string) RequestConfig {
	return NewRequestConfig(HttpGet, url)
}

// PostRequest creates a POST request config.
func PostRequest(url string) RequestConfig {
	return NewRequestConfig(HttpPost, url)
}

// HttpResponse is a typed AngularTS $http response.
type HttpResponse[T any] struct {
	Data       T
	Status     int
	StatusText string
	XHRStatus  HttpResponseStatus
}

// StorageType is a persistent storage backend selector.
type StorageType string

const (
	StorageLocal   StorageType = "local"
	StorageSession StorageType = "session"
	StorageCookie  StorageType = "cookie"
	StorageCustom  StorageType = "custom"
)

// StorageBackend is the minimal storage backend contract used by persisted Go app state.
type StorageBackend interface {
	Get(key string) (string, bool)
	Set(key string, value string)
	Remove(key string)
}

// CookieSameSite is a browser SameSite cookie policy.
type CookieSameSite string

const (
	CookieSameSiteLax    CookieSameSite = "Lax"
	CookieSameSiteStrict CookieSameSite = "Strict"
	CookieSameSiteNone   CookieSameSite = "None"
)

// CookieOptions captures AngularTS cookie write options.
type CookieOptions struct {
	Path     string
	Domain   string
	Expires  string
	Secure   bool
	SameSite CookieSameSite
}

// CookieStoreOptions captures cookie-backed store options.
type CookieStoreOptions struct {
	Cookie CookieOptions
}

// RootScopeService is the injectable AngularTS $rootScope facade.
type RootScopeService struct{ value jsValue }

// HttpService is the injectable AngularTS $http facade.
type HttpService struct{ value jsValue }

// LogService is the injectable AngularTS $log facade.
type LogService struct{ value jsValue }

// ExceptionHandlerService is the injectable AngularTS $exceptionHandler facade.
type ExceptionHandlerService struct{ value jsValue }

// PubSubService is the injectable AngularTS $eventBus facade.
type PubSubService struct{ value jsValue }

// ListenerFn is an AngularTS event listener callback shape.
type ListenerFn func(ScopeEvent)

// ScopeEvent is minimal AngularTS scope event metadata.
type ScopeEvent struct {
	Name               string
	DefaultPrevented   bool
	PropagationStopped bool
}

// InvocationDetail describes an AngularTS expression invocation.
type InvocationDetail struct {
	Expression string
	Arguments  []any
}

// TemplateRequestService is the injectable AngularTS $templateRequest facade.
type TemplateRequestService struct{ value jsValue }

// TemplateCacheService is the injectable AngularTS $templateCache facade.
type TemplateCacheService struct{ value jsValue }

// CookieService is the injectable AngularTS $cookie facade.
type CookieService struct{ value jsValue }

// StateService is the injectable AngularTS $state facade.
type StateService struct{ value jsValue }

// StateRegistryService is the injectable AngularTS $stateRegistry facade.
type StateRegistryService struct{ value jsValue }

// Transition is an AngularTS router transition facade.
type Transition struct{ value jsValue }

// WebSocketService is the injectable AngularTS $websocket facade.
type WebSocketService struct{ value jsValue }

// WebSocketConnection is a managed AngularTS WebSocket connection.
type WebSocketConnection struct{ value jsValue }

// SseService is the injectable AngularTS $sse facade.
type SseService struct{ value jsValue }

// SseConnection is a managed AngularTS SSE connection.
type SseConnection struct{ value jsValue }

// RestFactory is the injectable AngularTS $rest facade.
type RestFactory struct{ value jsValue }

// RestService is a typed AngularTS REST resource facade.
type RestService struct{ value jsValue }

func (RootScopeService) TokenName() string        { return "$rootScope" }
func (HttpService) TokenName() string             { return "$http" }
func (LogService) TokenName() string              { return "$log" }
func (ExceptionHandlerService) TokenName() string { return "$exceptionHandler" }
func (PubSubService) TokenName() string           { return "$eventBus" }
func (TemplateRequestService) TokenName() string  { return "$templateRequest" }
func (TemplateCacheService) TokenName() string    { return "$templateCache" }
func (CookieService) TokenName() string           { return "$cookie" }
func (StateService) TokenName() string            { return "$state" }
func (StateRegistryService) TokenName() string    { return "$stateRegistry" }
func (WebSocketService) TokenName() string        { return "$websocket" }
func (SseService) TokenName() string              { return "$sse" }
func (RestFactory) TokenName() string             { return "$rest" }

// StateDeclaration is a minimal AngularTS router state declaration.
type StateDeclaration struct {
	Name        string
	URL         string
	Component   string
	Template    string
	TemplateURL string
	Abstract    bool
}

// NewStateDeclaration creates a router state declaration.
func NewStateDeclaration(name string) StateDeclaration {
	return StateDeclaration{Name: name}
}

func (s StateDeclaration) WithURL(url string) StateDeclaration {
	s.URL = url
	return s
}

func (s StateDeclaration) WithComponent(component string) StateDeclaration {
	s.Component = component
	return s
}

func (s StateDeclaration) WithTemplate(template string) StateDeclaration {
	s.Template = template
	return s
}

func (s StateDeclaration) WithTemplateURL(templateURL string) StateDeclaration {
	s.TemplateURL = templateURL
	return s
}

func (s StateDeclaration) WithAbstract(abstract bool) StateDeclaration {
	s.Abstract = abstract
	return s
}

// StateResolve is minimal metadata for AngularTS state resolves.
type StateResolve struct {
	Token string
	Deps  []string
	Eager bool
}

// NewStateResolve creates a resolve declaration.
func NewStateResolve(token string) StateResolve {
	return StateResolve{Token: token}
}

func (r StateResolve) WithDep(dep string) StateResolve {
	r.Deps = append(r.Deps, dep)
	return r
}

func (r StateResolve) WithEager(eager bool) StateResolve {
	r.Eager = eager
	return r
}

// StateResolveObject is a Go representation of object-style state resolves.
type StateResolveObject map[string]StateResolve

// StateResolveArray is a Go representation of array-style state resolves.
type StateResolveArray []StateResolve

// SwapModeType is an AngularTS realtime DOM/content swap mode.
type SwapModeType string

const (
	SwapInnerHTML   SwapModeType = "innerHTML"
	SwapOuterHTML   SwapModeType = "outerHTML"
	SwapTextContent SwapModeType = "textContent"
	SwapBeforeBegin SwapModeType = "beforebegin"
	SwapAfterBegin  SwapModeType = "afterbegin"
	SwapBeforeEnd   SwapModeType = "beforeend"
	SwapAfterEnd    SwapModeType = "afterend"
	SwapDelete      SwapModeType = "delete"
	SwapNone        SwapModeType = "none"
)

// ConnectionConfig captures shared realtime connection options.
type ConnectionConfig struct {
	RetryDelayMS       int
	MaxRetries         int
	HeartbeatTimeoutMS int
	EventTypes         []string
}

func NewConnectionConfig() ConnectionConfig { return ConnectionConfig{} }

func (c ConnectionConfig) WithRetryDelay(ms int) ConnectionConfig {
	c.RetryDelayMS = ms
	return c
}

func (c ConnectionConfig) WithMaxRetries(max int) ConnectionConfig {
	c.MaxRetries = max
	return c
}

func (c ConnectionConfig) WithHeartbeatTimeout(ms int) ConnectionConfig {
	c.HeartbeatTimeoutMS = ms
	return c
}

func (c ConnectionConfig) WithEventType(eventType string) ConnectionConfig {
	c.EventTypes = append(c.EventTypes, eventType)
	return c
}

// ConnectionEvent is decoded realtime connection event metadata.
type ConnectionEvent[T any] struct {
	Type string
	Data T
}

// RealtimeProtocolMessage is consumed by AngularTS realtime directives.
type RealtimeProtocolMessage struct {
	Data   any
	HTML   any
	Target string
	Swap   SwapModeType
}

// RealtimeProtocolEventDetail is realtime protocol event detail metadata.
type RealtimeProtocolEventDetail[T any] struct {
	Data  T
	URL   string
	Error error
}

// WebSocketConfig captures AngularTS $websocket options.
type WebSocketConfig struct {
	ConnectionConfig
	Protocols []string
}

func NewWebSocketConfig() WebSocketConfig { return WebSocketConfig{} }

func (c WebSocketConfig) WithConnection(connection ConnectionConfig) WebSocketConfig {
	c.ConnectionConfig = connection
	return c
}

func (c WebSocketConfig) WithProtocol(protocol string) WebSocketConfig {
	c.Protocols = append(c.Protocols, protocol)
	return c
}

// SseConfig captures AngularTS $sse options.
type SseConfig struct {
	ConnectionConfig
	WithCredentials bool
	Params          map[string]string
}

func NewSseConfig() SseConfig { return SseConfig{} }

func (c SseConfig) WithConnection(connection ConnectionConfig) SseConfig {
	c.ConnectionConfig = connection
	return c
}

func (c SseConfig) WithCredentialsValue(withCredentials bool) SseConfig {
	c.WithCredentials = withCredentials
	return c
}

func (c SseConfig) WithParam(name string, value string) SseConfig {
	if c.Params == nil {
		c.Params = map[string]string{}
	}
	c.Params[name] = value
	return c
}

// RestDefinition describes a REST resource.
type RestDefinition struct {
	Name string
	URL  string
}

// RestOptions captures backend-specific REST options.
type RestOptions map[string]any

// RestRequest is a normalized REST request.
type RestRequest struct {
	Method        HttpMethod
	URL           string
	CollectionURL string
	ID            any
	Data          any
	Params        map[string]any
	Options       RestOptions
}

// RestResponse is a typed REST response.
type RestResponse[T any] struct {
	Data   T
	Source string
	Stale  bool
}

// RestBackend executes normalized REST requests.
type RestBackend interface {
	Request(RestRequest) (RestResponse[any], error)
}
