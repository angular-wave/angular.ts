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

// MachineMode is a mode name used by AngularTS $machine.
type MachineMode string

// MachineEventMap is event metadata keyed by event type.
type MachineEventMap map[string]any

// MachineTransitionResult is returned by a machine transition.
type MachineTransitionResult struct {
	Mode MachineMode
}

// NextMode creates a transition result that moves to mode.
func NextMode(mode MachineMode) MachineTransitionResult {
	return MachineTransitionResult{Mode: mode}
}

// Stay keeps the current mode after transition effects have run.
func Stay() MachineTransitionResult {
	return MachineTransitionResult{}
}

// MachineTransition mutates data and optionally returns the next mode.
type MachineTransition[TData any, TPayload any] func(data *TData, payload TPayload, machine *Machine[TData, TPayload]) MachineTransitionResult

// MachineGuard decides whether a transition may run.
type MachineGuard[TData any, TPayload any] func(data *TData, payload TPayload, machine *Machine[TData, TPayload]) bool

// MachineTransitionDescriptor stores a guarded transition target.
type MachineTransitionDescriptor[TData any, TPayload any] struct {
	Guard  MachineGuard[TData, TPayload]
	Target MachineTransition[TData, TPayload]
}

// NewMachineTransitionDescriptor creates a guarded transition descriptor.
func NewMachineTransitionDescriptor[TData any, TPayload any](guard MachineGuard[TData, TPayload], target MachineTransition[TData, TPayload]) MachineTransitionDescriptor[TData, TPayload] {
	return MachineTransitionDescriptor[TData, TPayload]{Guard: guard, Target: target}
}

// Definition converts the descriptor into a transition definition.
func (d MachineTransitionDescriptor[TData, TPayload]) Definition() MachineTransitionDefinition[TData, TPayload] {
	return MachineTransitionDefinition[TData, TPayload]{Guard: d.Guard, Target: d.Target}
}

// MachineTransitionDefinition stores a bare or guarded transition target.
type MachineTransitionDefinition[TData any, TPayload any] struct {
	Guard  MachineGuard[TData, TPayload]
	Target MachineTransition[TData, TPayload]
}

// NewMachineTransitionDefinition creates a transition definition from a bare transition.
func NewMachineTransitionDefinition[TData any, TPayload any](target MachineTransition[TData, TPayload]) MachineTransitionDefinition[TData, TPayload] {
	return MachineTransitionDefinition[TData, TPayload]{Target: target}
}

// CanRun reports whether the definition has a target and its guard passes.
func (d MachineTransitionDefinition[TData, TPayload]) CanRun(data *TData, payload TPayload, machine *Machine[TData, TPayload]) bool {
	return d.Target != nil && (d.Guard == nil || d.Guard(data, payload, machine))
}

// MachineTransitionMap is keyed by current mode and event type.
type MachineTransitionMap[TData any, TPayload any] map[MachineMode]map[string]MachineTransitionDefinition[TData, TPayload]

// MachineTransitionContext is passed to machine hooks.
type MachineTransitionContext[TData any, TPayload any] struct {
	Type    string
	From    MachineMode
	To      MachineMode
	Payload TPayload
	Data    *TData
	Machine *Machine[TData, TPayload]
}

// MachineTransitionHook observes a handled transition.
type MachineTransitionHook[TData any, TPayload any] func(MachineTransitionContext[TData, TPayload])

// MachineModeHooks stores mode-specific hooks.
type MachineModeHooks[TData any, TPayload any] map[MachineMode]MachineTransitionHook[TData, TPayload]

// MachineHooks stores optional machine transition hooks.
type MachineHooks[TData any, TPayload any] struct {
	Enter      MachineModeHooks[TData, TPayload]
	Exit       MachineModeHooks[TData, TPayload]
	Transition MachineTransitionHook[TData, TPayload]
}

// MachineConfig configures a Go-authored machine.
type MachineConfig[TData any, TPayload any] struct {
	Initial     MachineMode
	Data        TData
	Transitions MachineTransitionMap[TData, TPayload]
	Hooks       MachineHooks[TData, TPayload]
}

// WithTransition adds a transition for mode and event type.
func (c MachineConfig[TData, TPayload]) WithTransition(mode MachineMode, eventType string, transition MachineTransition[TData, TPayload]) MachineConfig[TData, TPayload] {
	return c.WithTransitionDefinition(mode, eventType, NewMachineTransitionDefinition(transition))
}

// WithGuardedTransition adds a guarded transition for mode and event type.
func (c MachineConfig[TData, TPayload]) WithGuardedTransition(mode MachineMode, eventType string, guard MachineGuard[TData, TPayload], transition MachineTransition[TData, TPayload]) MachineConfig[TData, TPayload] {
	return c.WithTransitionDefinition(mode, eventType, NewMachineTransitionDescriptor(guard, transition).Definition())
}

// WithTransitionDefinition adds a bare or guarded transition definition.
func (c MachineConfig[TData, TPayload]) WithTransitionDefinition(mode MachineMode, eventType string, definition MachineTransitionDefinition[TData, TPayload]) MachineConfig[TData, TPayload] {
	if c.Transitions == nil {
		c.Transitions = MachineTransitionMap[TData, TPayload]{}
	}
	if c.Transitions[mode] == nil {
		c.Transitions[mode] = map[string]MachineTransitionDefinition[TData, TPayload]{}
	}
	c.Transitions[mode][eventType] = definition
	return c
}

// MachineSnapshot captures a machine's current mode and data.
type MachineSnapshot[TData any] struct {
	Current MachineMode
	Data    TData
}

// Machine is a small Go-native runtime matching AngularTS $machine semantics.
type Machine[TData any, TPayload any] struct {
	Current     MachineMode
	Data        TData
	Transitions MachineTransitionMap[TData, TPayload]
	Hooks       MachineHooks[TData, TPayload]
}

// MachineProvider is the config-free provider facade for AngularTS $machine.
type MachineProvider struct{}

// ProviderName returns the AngularTS config-time provider token.
func (MachineProvider) ProviderName() string { return "$machineProvider" }

// ServiceName returns the runtime service token produced by this provider.
func (MachineProvider) ServiceName() string { return "$machine" }

// NewMachine creates a machine from config.
func NewMachine[TData any, TPayload any](config MachineConfig[TData, TPayload]) *Machine[TData, TPayload] {
	return &Machine[TData, TPayload]{
		Current:     config.Initial,
		Data:        config.Data,
		Transitions: config.Transitions,
		Hooks:       config.Hooks,
	}
}

// Can reports whether the current mode handles eventType.
func (m *Machine[TData, TPayload]) Can(eventType string) bool {
	transitions := m.Transitions[m.Current]
	if transitions == nil {
		return false
	}
	definition, ok := transitions[eventType]
	return ok && definition.Target != nil
}

// CanWithPayload reports whether the current mode handles eventType and its guard accepts payload.
func (m *Machine[TData, TPayload]) CanWithPayload(eventType string, payload TPayload) bool {
	transitions := m.Transitions[m.Current]
	if transitions == nil {
		return false
	}
	definition, ok := transitions[eventType]
	return ok && definition.CanRun(&m.Data, payload, m)
}

// Matches reports whether the machine is in mode.
func (m *Machine[TData, TPayload]) Matches(mode MachineMode) bool {
	return m.Current == mode
}

// Send runs a transition. It returns true when a handler exists and ran.
func (m *Machine[TData, TPayload]) Send(eventType string, payload TPayload) bool {
	transitions := m.Transitions[m.Current]
	if transitions == nil {
		return false
	}
	definition, ok := transitions[eventType]
	if !ok || !definition.CanRun(&m.Data, payload, m) {
		return false
	}

	from := m.Current
	result := definition.Target(&m.Data, payload, m)
	to := from
	if result.Mode != "" {
		to = result.Mode
	}

	context := MachineTransitionContext[TData, TPayload]{
		Type:    eventType,
		From:    from,
		To:      to,
		Payload: payload,
		Data:    &m.Data,
		Machine: m,
	}

	if from != to && m.Hooks.Exit != nil {
		if hook := m.Hooks.Exit[from]; hook != nil {
			hook(context)
		}
	}

	m.Current = to

	if from != to && m.Hooks.Enter != nil {
		if hook := m.Hooks.Enter[to]; hook != nil {
			hook(context)
		}
	}

	if m.Hooks.Transition != nil {
		m.Hooks.Transition(context)
	}

	return true
}

// Snapshot returns the current mode and data value.
func (m *Machine[TData, TPayload]) Snapshot() MachineSnapshot[TData] {
	return MachineSnapshot[TData]{Current: m.Current, Data: m.Data}
}

// Restore replaces the current mode and data from snapshot.
func (m *Machine[TData, TPayload]) Restore(snapshot MachineSnapshot[TData]) {
	m.Current = snapshot.Current
	m.Data = snapshot.Data
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

// MachineService is the injectable AngularTS $machine facade.
type MachineService struct{ value jsValue }

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
func (MachineService) TokenName() string          { return "$machine" }

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
