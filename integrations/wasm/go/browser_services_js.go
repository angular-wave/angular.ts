//go:build js && wasm

package angularwasm

import (
	"encoding/json"
	"syscall/js"
)

func WrapRootScopeService(value js.Value) RootScopeService { return RootScopeService{value: value} }
func WrapHttpService(value js.Value) HttpService           { return HttpService{value: value} }
func WrapLogService(value js.Value) LogService             { return LogService{value: value} }
func WrapExceptionHandlerService(value js.Value) ExceptionHandlerService {
	return ExceptionHandlerService{value: value}
}
func WrapPubSubService(value js.Value) PubSubService { return PubSubService{value: value} }
func WrapTemplateRequestService(value js.Value) TemplateRequestService {
	return TemplateRequestService{value: value}
}
func WrapTemplateCacheService(value js.Value) TemplateCacheService {
	return TemplateCacheService{value: value}
}
func WrapCookieService(value js.Value) CookieService { return CookieService{value: value} }
func WrapStateService(value js.Value) StateService   { return StateService{value: value} }
func WrapStateRegistryService(value js.Value) StateRegistryService {
	return StateRegistryService{value: value}
}
func WrapWebSocketService(value js.Value) WebSocketService { return WebSocketService{value: value} }
func WrapSseService(value js.Value) SseService             { return SseService{value: value} }
func WrapRestFactory(value js.Value) RestFactory           { return RestFactory{value: value} }

func (s RootScopeService) NewChild() js.Value { return s.value.Call("$new") }

func (s HttpService) Get(url string) js.Value { return s.value.Call("get", url) }
func (s HttpService) GetWith(url string, config RequestShortcutConfig) js.Value {
	return s.value.Call("get", url, requestShortcutToJS(config))
}
func (s HttpService) Post(url string, body any) js.Value {
	return s.value.Call("post", url, toJS(body))
}
func (s HttpService) PostWith(url string, body any, config RequestShortcutConfig) js.Value {
	return s.value.Call("post", url, toJS(body), requestShortcutToJS(config))
}
func (s HttpService) Request(config RequestConfig) js.Value {
	return s.value.Invoke(requestConfigToJS(config))
}

func (s LogService) Log(value any)   { s.value.Call("log", toJS(value)) }
func (s LogService) Info(value any)  { s.value.Call("info", toJS(value)) }
func (s LogService) Warn(value any)  { s.value.Call("warn", toJS(value)) }
func (s LogService) Error(value any) { s.value.Call("error", toJS(value)) }
func (s LogService) Debug(value any) { s.value.Call("debug", toJS(value)) }

func (s PubSubService) Publish(topic string, value any) bool {
	return s.value.Call("publish", topic, toJS(value)).Bool()
}
func (s PubSubService) Subscribe(topic string, listener js.Func) js.Value {
	return s.value.Call("subscribe", topic, listener)
}
func (s PubSubService) SubscribeOnce(topic string, listener js.Func) js.Value {
	return s.value.Call("subscribeOnce", topic, listener)
}
func (s PubSubService) Count(topic string) int { return s.value.Call("getCount", topic).Int() }
func (s PubSubService) Reset()                 { s.value.Call("reset") }
func (s PubSubService) Dispose()               { s.value.Call("dispose") }

func (s TemplateRequestService) Request(url string) js.Value { return s.value.Invoke(url) }

func (s TemplateCacheService) Get(url string) string {
	value := s.value.Call("get", url)
	if value.IsNull() || value.IsUndefined() {
		return ""
	}
	return value.String()
}
func (s TemplateCacheService) Set(url string, template string) {
	s.value.Call("set", url, template)
}
func (s TemplateCacheService) Has(url string) bool    { return s.value.Call("has", url).Bool() }
func (s TemplateCacheService) Delete(url string) bool { return s.value.Call("delete", url).Bool() }

func (s CookieService) Get(key string) string {
	value := s.value.Call("get", key)
	if value.IsNull() || value.IsUndefined() {
		return ""
	}
	return value.String()
}
func (s CookieService) Put(key string, value string, options CookieOptions) {
	s.value.Call("put", key, value, cookieOptionsToJS(options))
}
func (s CookieService) Remove(key string, options CookieOptions) {
	s.value.Call("remove", key, cookieOptionsToJS(options))
}

// Go transitions to a state with optional JSON-compatible parameters.
func (s StateService) Go(state string, params any) js.Value {
	if params == nil {
		return s.value.Call("go", state)
	}
	return s.value.Call("go", state, toJS(params))
}

// Href returns a URL for a state and optional JSON-compatible parameters.
func (s StateService) Href(state string, params any) string {
	var result js.Value
	if params == nil {
		result = s.value.Call("href", state)
	} else {
		result = s.value.Call("href", state, toJS(params))
	}
	if result.IsNull() || result.IsUndefined() {
		return ""
	}
	return result.String()
}

func (s StateService) Is(state string) bool       { return s.value.Call("is", state).Bool() }
func (s StateService) Includes(state string) bool { return s.value.Call("includes", state).Bool() }
func (s StateService) Reload() js.Value           { return s.value.Call("reload") }
func (s StateService) Get(state string) js.Value  { return s.value.Call("get", state) }

// Register adds a state declaration to $stateRegistry.
func (s StateRegistryService) Register(state StateDeclaration) js.Value {
	return s.value.Call("register", state.toJS())
}

func (s StateRegistryService) Deregister(state string) js.Value {
	return s.value.Call("deregister", state)
}

func (s StateRegistryService) Get(state string) js.Value {
	return s.value.Call("get", state)
}

func (t Transition) From() js.Value     { return t.value.Call("from") }
func (t Transition) To() js.Value       { return t.value.Call("to") }
func (t Transition) Params() js.Value   { return t.value.Call("params") }
func (t Transition) Entering() js.Value { return t.value.Call("entering") }
func (t Transition) Exiting() js.Value  { return t.value.Call("exiting") }
func (t Transition) Dynamic() bool      { return t.value.Call("dynamic").Bool() }
func (t Transition) IsActive() bool     { return t.value.Call("isActive").Bool() }
func (t Transition) Valid() bool        { return t.value.Call("valid").Bool() }
func (t Transition) Abort()             { t.value.Call("abort") }

// Open creates a managed WebSocket connection.
func (s WebSocketService) Open(url string, config WebSocketConfig) WebSocketConnection {
	return WebSocketConnection{
		value: s.value.Invoke(url, stringSliceToJS(config.Protocols), config.toJS()),
	}
}

func (c WebSocketConnection) Connect() { c.value.Call("connect") }
func (c WebSocketConnection) Close()   { c.value.Call("close") }
func (c WebSocketConnection) Send(value any) {
	c.value.Call("send", toJS(value))
}

// Open creates a managed SSE connection.
func (s SseService) Open(url string, config SseConfig) SseConnection {
	return SseConnection{value: s.value.Invoke(url, config.toJS())}
}

func (c SseConnection) Connect() { c.value.Call("connect") }
func (c SseConnection) Close()   { c.value.Call("close") }

// Resource creates a REST resource client.
func (f RestFactory) Resource(baseURL string, options RestOptions) RestService {
	if options == nil {
		return RestService{value: f.value.Invoke(baseURL)}
	}
	return RestService{value: f.value.Invoke(baseURL, js.Undefined(), toJS(options))}
}

// List fetches a collection.
func (s RestService) List(params any) js.Value {
	if params == nil {
		return s.value.Call("list")
	}
	return s.value.Call("list", toJS(params))
}

func (s RestService) Get(id any) js.Value {
	return s.value.Call("get", toJS(id))
}

func (s RestService) Create(item any) js.Value {
	return s.value.Call("create", toJS(item))
}

func (s RestService) Update(id any, item any) js.Value {
	return s.value.Call("update", toJS(id), toJS(item))
}

func (s RestService) Delete(id any) js.Value {
	return s.value.Call("delete", toJS(id))
}

func (s StateDeclaration) toJS() js.Value {
	value := map[string]any{"name": s.Name}
	if s.URL != "" {
		value["url"] = s.URL
	}
	if s.Component != "" {
		value["component"] = s.Component
	}
	if s.Template != "" {
		value["template"] = s.Template
	}
	if s.TemplateURL != "" {
		value["templateUrl"] = s.TemplateURL
	}
	if s.Abstract {
		value["abstract"] = true
	}
	return toJS(value)
}

func (c WebSocketConfig) toJS() js.Value {
	value := connectionConfigToMap(c.ConnectionConfig)
	if len(c.Protocols) > 0 {
		value["protocols"] = c.Protocols
	}
	return toJS(value)
}

func (c SseConfig) toJS() js.Value {
	value := connectionConfigToMap(c.ConnectionConfig)
	if c.WithCredentials {
		value["withCredentials"] = true
	}
	if len(c.Params) > 0 {
		value["params"] = c.Params
	}
	return toJS(value)
}

func connectionConfigToMap(c ConnectionConfig) map[string]any {
	value := map[string]any{}
	if c.RetryDelayMS > 0 {
		value["retryDelay"] = c.RetryDelayMS
	}
	if c.MaxRetries > 0 {
		value["maxRetries"] = c.MaxRetries
	}
	if c.HeartbeatTimeoutMS > 0 {
		value["heartbeatTimeout"] = c.HeartbeatTimeoutMS
	}
	if len(c.EventTypes) > 0 {
		value["eventTypes"] = c.EventTypes
	}
	return value
}

func requestShortcutToJS(config RequestShortcutConfig) js.Value {
	value := map[string]any{}
	if len(config.Headers) > 0 {
		value["headers"] = config.Headers
	}
	if len(config.Params) > 0 {
		value["params"] = config.Params
	}
	if config.TimeoutMS > 0 {
		value["timeout"] = config.TimeoutMS
	}
	if config.ResponseType != "" {
		value["responseType"] = config.ResponseType
	}
	if config.Credentials != nil {
		value["withCredentials"] = *config.Credentials
	}
	return toJS(value)
}

func requestConfigToJS(config RequestConfig) js.Value {
	value := map[string]any{
		"method": string(config.Method),
		"url":    config.URL,
	}
	if len(config.Headers) > 0 {
		value["headers"] = config.Headers
	}
	if len(config.Params) > 0 {
		value["params"] = config.Params
	}
	if config.TimeoutMS > 0 {
		value["timeout"] = config.TimeoutMS
	}
	if config.ResponseType != "" {
		value["responseType"] = config.ResponseType
	}
	if config.Credentials != nil {
		value["withCredentials"] = *config.Credentials
	}
	return toJS(value)
}

func cookieOptionsToJS(options CookieOptions) js.Value {
	value := map[string]any{}
	if options.Path != "" {
		value["path"] = options.Path
	}
	if options.Domain != "" {
		value["domain"] = options.Domain
	}
	if options.Expires != "" {
		value["expires"] = options.Expires
	}
	if options.Secure {
		value["secure"] = true
	}
	if options.SameSite != "" {
		value["samesite"] = string(options.SameSite)
	}
	return toJS(value)
}

func toJS(value any) js.Value {
	encoded, err := json.Marshal(value)
	if err != nil {
		return js.Undefined()
	}
	return js.Global().Get("JSON").Call("parse", string(encoded))
}

func stringSliceToJS(values []string) js.Value {
	array := js.Global().Get("Array").New()
	for _, value := range values {
		array.Call("push", value)
	}
	return array
}
