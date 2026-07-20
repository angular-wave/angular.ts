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

// HttpRequestOptions captures options accepted by AngularTS HTTP shortcut methods.
type HttpRequestOptions struct {
	Headers      map[string]string
	Params       map[string]string
	TimeoutMS    int
	ResponseType string
	Credentials  *bool
}

// NewRequestShortcutConfig creates empty HTTP shortcut options.
func NewRequestShortcutConfig() HttpRequestOptions {
	return HttpRequestOptions{}
}

// WithHeader sets one request header.
func (c HttpRequestOptions) WithHeader(name string, value string) HttpRequestOptions {
	if c.Headers == nil {
		c.Headers = map[string]string{}
	}
	c.Headers[name] = value
	return c
}

// WithParam sets one query parameter.
func (c HttpRequestOptions) WithParam(name string, value string) HttpRequestOptions {
	if c.Params == nil {
		c.Params = map[string]string{}
	}
	c.Params[name] = value
	return c
}

// WithTimeout sets a millisecond request timeout.
func (c HttpRequestOptions) WithTimeout(timeoutMS int) HttpRequestOptions {
	c.TimeoutMS = timeoutMS
	return c
}

// WithResponseType sets the response body reader hint.
func (c HttpRequestOptions) WithResponseType(responseType string) HttpRequestOptions {
	c.ResponseType = responseType
	return c
}

// WithCredentials sets whether cross-site requests include credentials.
func (c HttpRequestOptions) WithCredentials(withCredentials bool) HttpRequestOptions {
	c.Credentials = &withCredentials
	return c
}

// HttpRequestConfig is a minimal AngularTS $http request config.
type HttpRequestConfig struct {
	Method HttpMethod
	URL    string
	HttpRequestOptions
}

// NewRequestConfig creates a request config for method and URL.
func NewRequestConfig(method HttpMethod, url string) HttpRequestConfig {
	return HttpRequestConfig{Method: method, URL: url}
}

// GetRequest creates a GET request config.
func GetRequest(url string) HttpRequestConfig {
	return NewRequestConfig(HttpGet, url)
}

// PostRequest creates a POST request config.
func PostRequest(url string) HttpRequestConfig {
	return NewRequestConfig(HttpPost, url)
}

// HttpResponse is a typed AngularTS $http response.
type HttpResponse[T any] struct {
	Data       T
	Status     int
	StatusText string
	XHRStatus  HttpResponseStatus
}

// WorkerType selects the browser Worker script mode.
type WorkerType string

const (
	WorkerModule  WorkerType = "module"
	WorkerClassic WorkerType = "classic"
)

// WorkerCredentials controls credentials for module Worker scripts.
type WorkerCredentials string

const (
	WorkerCredentialsOmit       WorkerCredentials = "omit"
	WorkerCredentialsSameOrigin WorkerCredentials = "same-origin"
	WorkerCredentialsInclude    WorkerCredentials = "include"
)

// WorkerStatus is the lifecycle state exposed by a managed WorkerHandle.
type WorkerStatus string

const (
	WorkerRunning    WorkerStatus = "running"
	WorkerRestarting WorkerStatus = "restarting"
	WorkerFailed     WorkerStatus = "error"
	WorkerTerminated WorkerStatus = "terminated"
)

// WorkerErrorCode identifies a managed worker failure category.
type WorkerErrorCode string

const (
	WorkerRuntimeError        WorkerErrorCode = "runtime"
	WorkerMessageError        WorkerErrorCode = "message"
	WorkerDecodeError         WorkerErrorCode = "decode"
	WorkerRequestError        WorkerErrorCode = "request"
	WorkerRequestTimeoutError WorkerErrorCode = "request-timeout"
	WorkerRequestAbortedError WorkerErrorCode = "request-aborted"
	WorkerTerminatedError     WorkerErrorCode = "terminated"
)

// WorkerError is portable metadata from an AngularTS WorkerError.
type WorkerError struct {
	Code    WorkerErrorCode
	Message string
	Cause   any
}

// WorkerConfig configures one managed browser Worker.
type WorkerConfig struct {
	Type           WorkerType
	Name           string
	Credentials    WorkerCredentials
	Restart        bool
	RestartDelayMS int
	MaxRestarts    int
	decode         jsValue
}

// NewWorkerConfig creates module Worker options with automatic restart disabled.
func NewWorkerConfig() WorkerConfig {
	return WorkerConfig{Type: WorkerModule}
}

// Classic selects a classic Worker script.
func (c WorkerConfig) Classic() WorkerConfig {
	c.Type = WorkerClassic
	return c
}

// WithName assigns the native Worker name.
func (c WorkerConfig) WithName(name string) WorkerConfig {
	c.Name = name
	return c
}

// WithCredentials assigns the native Worker credentials mode.
func (c WorkerConfig) WithCredentials(credentials WorkerCredentials) WorkerConfig {
	c.Credentials = credentials
	return c
}

// WithRestart enables bounded automatic restart with exponential backoff.
func (c WorkerConfig) WithRestart(delayMS int, maxRestarts int) WorkerConfig {
	c.Restart = true
	c.RestartDelayMS = delayMS
	c.MaxRestarts = maxRestarts
	return c
}

// WorkerRequestOptions configures one correlated WorkerHandle request.
type WorkerRequestOptions struct {
	TimeoutMS int
	signal    jsValue
	transfer  []jsValue
}

// NewWorkerRequestOptions creates request options using the framework timeout.
func NewWorkerRequestOptions() WorkerRequestOptions { return WorkerRequestOptions{} }

// WithTimeout sets a request timeout in milliseconds.
func (c WorkerRequestOptions) WithTimeout(timeoutMS int) WorkerRequestOptions {
	c.TimeoutMS = timeoutMS
	return c
}

// WorkerRequest is the correlated request envelope understood by AngularTS workers.
type WorkerRequest[T any] struct {
	Type    string
	ID      string
	Payload T
}

// WorkerResponse is the correlated response envelope returned by AngularTS workers.
type WorkerResponse[T any] struct {
	Type   string
	ID     string
	OK     bool
	Result T
	Error  any
}

// WorkerModelMessage is the shared model-channel protocol envelope.
type WorkerModelMessage[T any] struct {
	Type     string
	Channel  string
	Snapshot T
	Change   any
	Options  any
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

// MachineState is a state name used by AngularTS $machine.
type MachineState string

// MachineEventMap is event metadata keyed by event type.
type MachineEventMap map[string]any

// MachineEventTransitionContext is passed to state-tree transition callbacks.
type MachineEventTransitionContext[TData any, TPayload any] struct {
	Type    string
	From    MachineState
	To      MachineState
	Payload TPayload
	Data    *TData
	Machine *Machine[TData, TPayload]
}

// MachineEventTransitionGuard decides whether a state-tree transition may run.
type MachineEventTransitionGuard[TData any, TPayload any] func(MachineEventTransitionContext[TData, TPayload]) bool

// MachineEventTransitionUpdate mutates data for a state-tree transition.
type MachineEventTransitionUpdate[TData any, TPayload any] func(*MachineEventTransitionContext[TData, TPayload])

// MachineEventTransitionHook observes a state-tree transition.
type MachineEventTransitionHook[TData any, TPayload any] func(MachineEventTransitionContext[TData, TPayload])

// MachineStateHooks stores state-specific hooks.
type MachineStateHooks[TData any, TPayload any] map[MachineState]MachineEventTransitionHook[TData, TPayload]

// MachineHooks stores optional machine transition hooks.
type MachineHooks[TData any, TPayload any] struct {
	Enter      MachineStateHooks[TData, TPayload]
	Exit       MachineStateHooks[TData, TPayload]
	Transition MachineEventTransitionHook[TData, TPayload]
}

// MachineEventTransitionConfig configures one state-tree event transition.
type MachineEventTransitionConfig[TData any, TPayload any] struct {
	To     MachineState
	Guard  MachineEventTransitionGuard[TData, TPayload]
	Before MachineEventTransitionHook[TData, TPayload]
	Update MachineEventTransitionUpdate[TData, TPayload]
	After  MachineEventTransitionHook[TData, TPayload]
	Denied MachineEventTransitionHook[TData, TPayload]
}

// CanRun reports whether the transition is configured and its guard passes.
func (c MachineEventTransitionConfig[TData, TPayload]) CanRun(context MachineEventTransitionContext[TData, TPayload]) bool {
	return (c.To != "" || c.Update != nil) && (c.Guard == nil || c.Guard(context))
}

// MachineStateTransitionMap is keyed by event type for one state.
type MachineStateTransitionMap[TData any, TPayload any] map[string]MachineEventTransitionConfig[TData, TPayload]

// MachineStateDefinition stores the event transitions for one state.
type MachineStateDefinition[TData any, TPayload any] struct {
	On MachineStateTransitionMap[TData, TPayload]
}

// MachineStateMap is keyed by machine state.
type MachineStateMap[TData any, TPayload any] map[MachineState]MachineStateDefinition[TData, TPayload]

// MachineStateConfig configures a Go-authored state-tree machine.
type MachineStateConfig[TData any, TPayload any] struct {
	Initial MachineState
	Data    TData
	States  MachineStateMap[TData, TPayload]
	Hooks   MachineHooks[TData, TPayload]
}

// WithEvent adds an explicit event transition for state and event type.
func (c MachineStateConfig[TData, TPayload]) WithEvent(stateName MachineState, eventType string, transition MachineEventTransitionConfig[TData, TPayload]) MachineStateConfig[TData, TPayload] {
	if c.States == nil {
		c.States = MachineStateMap[TData, TPayload]{}
	}
	definition := c.States[stateName]
	if definition.On == nil {
		definition.On = MachineStateTransitionMap[TData, TPayload]{}
	}
	definition.On[eventType] = transition
	c.States[stateName] = definition
	if transition.To != "" {
		if _, ok := c.States[transition.To]; !ok {
			c.States[transition.To] = MachineStateDefinition[TData, TPayload]{}
		}
	}
	return c
}

// WithRoute adds a state transition that changes state without data updates.
func (c MachineStateConfig[TData, TPayload]) WithRoute(stateName MachineState, eventType string, to MachineState) MachineStateConfig[TData, TPayload] {
	return c.WithEvent(stateName, eventType, MachineEventTransitionConfig[TData, TPayload]{To: to})
}

// WithUpdate adds a same-state transition that updates data.
func (c MachineStateConfig[TData, TPayload]) WithUpdate(stateName MachineState, eventType string, update MachineEventTransitionUpdate[TData, TPayload]) MachineStateConfig[TData, TPayload] {
	return c.WithEvent(stateName, eventType, MachineEventTransitionConfig[TData, TPayload]{Update: update})
}

// MachineSnapshot captures a machine's current state and data.
type MachineSnapshot[TData any] struct {
	State MachineState
	Data  TData
}

// Machine is a small Go-native runtime matching AngularTS $machine semantics.
type Machine[TData any, TPayload any] struct {
	State  MachineState
	Data   TData
	States MachineStateMap[TData, TPayload]
	Hooks  MachineHooks[TData, TPayload]
}

// NewMachine creates a machine from state-tree config.
func NewMachine[TData any, TPayload any](config MachineStateConfig[TData, TPayload]) *Machine[TData, TPayload] {
	return &Machine[TData, TPayload]{
		State:  config.Initial,
		Data:   config.Data,
		States: config.States,
		Hooks:  config.Hooks,
	}
}

// Can reports whether the current state handles eventType.
func (m *Machine[TData, TPayload]) Can(eventType string) bool {
	state, ok := m.States[m.State]
	if !ok || state.On == nil {
		return false
	}
	transition, ok := state.On[eventType]
	return ok && (transition.To != "" || transition.Update != nil)
}

// CanWithPayload reports whether the current state handles eventType and its guard accepts payload.
func (m *Machine[TData, TPayload]) CanWithPayload(eventType string, payload TPayload) bool {
	state, ok := m.States[m.State]
	if !ok || state.On == nil {
		return false
	}
	transition, ok := state.On[eventType]
	if !ok {
		return false
	}
	context := MachineEventTransitionContext[TData, TPayload]{
		Type:    eventType,
		From:    m.State,
		To:      transition.To,
		Payload: payload,
		Data:    &m.Data,
		Machine: m,
	}
	return transition.CanRun(context)
}

// Matches reports whether the machine is in state.
func (m *Machine[TData, TPayload]) Matches(state MachineState) bool {
	return m.State == state
}

// Send runs a transition. It returns true when a handler exists and ran.
func (m *Machine[TData, TPayload]) Send(eventType string, payload TPayload) bool {
	state, ok := m.States[m.State]
	if !ok || state.On == nil {
		return false
	}
	transition, ok := state.On[eventType]
	if !ok {
		return false
	}

	from := m.State
	context := MachineEventTransitionContext[TData, TPayload]{
		Type:    eventType,
		From:    from,
		To:      transition.To,
		Payload: payload,
		Data:    &m.Data,
		Machine: m,
	}
	if context.To == "" {
		context.To = from
	}

	if !transition.CanRun(context) {
		if transition.Denied != nil {
			transition.Denied(context)
		}
		return false
	}

	if transition.Before != nil {
		transition.Before(context)
	}

	if transition.Update != nil {
		transition.Update(&context)
	}

	to := context.To
	if to == "" {
		to = from
		context.To = to
	}

	if from != to && m.Hooks.Exit != nil {
		if hook := m.Hooks.Exit[from]; hook != nil {
			hook(context)
		}
	}

	m.State = to

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

// Snapshot returns the current state and data value.
func (m *Machine[TData, TPayload]) Snapshot() MachineSnapshot[TData] {
	return MachineSnapshot[TData]{State: m.State, Data: m.Data}
}

// Restore replaces the current state and data from snapshot.
func (m *Machine[TData, TPayload]) Restore(snapshot MachineSnapshot[TData]) {
	m.State = snapshot.State
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

// WorkerService is the injectable AngularTS $worker facade.
type WorkerService struct{ value jsValue }

// WorkerHandle is a managed AngularTS browser Worker facade.
type WorkerHandle struct{ value jsValue }

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
func (WorkerService) TokenName() string           { return "$worker" }

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

// SwapMode is an AngularTS realtime DOM/content swap state.
type SwapMode string

const (
	SwapInnerHTML   SwapMode = "innerHTML"
	SwapOuterHTML   SwapMode = "outerHTML"
	SwapTextContent SwapMode = "textContent"
	SwapBeforeBegin SwapMode = "beforebegin"
	SwapAfterBegin  SwapMode = "afterbegin"
	SwapBeforeEnd   SwapMode = "beforeend"
	SwapAfterEnd    SwapMode = "afterend"
	SwapDelete      SwapMode = "delete"
	SwapNone        SwapMode = "none"
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
	Swap   SwapMode
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
