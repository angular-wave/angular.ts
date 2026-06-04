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
		"machine":         (MachineService{}).TokenName(),
		"machineProvider": (MachineProvider{}).ProviderName(),
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
		"machine":         "$machine",
		"machineProvider": "$machineProvider",
	}

	for name, got := range tests {
		if got != want[name] {
			t.Fatalf("%s token mismatch: want %s got %s", name, want[name], got)
		}
	}

	if (MachineProvider{}).ServiceName() != "$machine" {
		t.Fatalf("machine provider should expose the $machine runtime service")
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

func TestMachineFacadeRunsTransitionsHooksAndSnapshots(t *testing.T) {
	type sessionData struct {
		Starts     int
		LastPlayer string
	}

	enterCount := 0
	exitCount := 0
	transitionCount := 0

	config := MachineConfig[sessionData, string]{
		Initial: MachineMode("idle"),
		Data:    sessionData{},
		Hooks: MachineHooks[sessionData, string]{
			Enter: MachineModeHooks[sessionData, string]{
				MachineMode("active"): func(context MachineTransitionContext[sessionData, string]) {
					if context.From != MachineMode("idle") || context.To != MachineMode("active") {
						t.Fatalf("unexpected enter context: %#v", context)
					}
					if context.Data == nil || context.Data.Starts != 1 {
						t.Fatalf("expected transition-mutated data in enter hook: %#v", context.Data)
					}
					enterCount++
				},
			},
			Exit: MachineModeHooks[sessionData, string]{
				MachineMode("idle"): func(context MachineTransitionContext[sessionData, string]) {
					if context.Type != "start" || context.Payload != "ada" {
						t.Fatalf("unexpected exit context: %#v", context)
					}
					exitCount++
				},
			},
			Transition: func(context MachineTransitionContext[sessionData, string]) {
				if context.To == "" || context.Machine == nil {
					t.Fatalf("unexpected transition context: %#v", context)
				}
				transitionCount++
			},
		},
	}.
		WithTransition(MachineMode("idle"), "start", func(data *sessionData, payload string, machine *Machine[sessionData, string]) MachineTransitionResult {
			data.Starts++
			data.LastPlayer = payload
			return NextMode(MachineMode("active"))
		}).
		WithTransition(MachineMode("active"), "refresh", func(data *sessionData, payload string, machine *Machine[sessionData, string]) MachineTransitionResult {
			data.LastPlayer = payload
			return Stay()
		})
	machine := NewMachine(config)

	if !machine.Matches(MachineMode("idle")) || !machine.Can("start") || machine.Can("refresh") {
		t.Fatalf("unexpected initial machine state: %#v", machine)
	}
	if !machine.Send("start", "ada") {
		t.Fatalf("expected start transition to run")
	}
	if !machine.Matches(MachineMode("active")) || machine.Data.Starts != 1 || machine.Data.LastPlayer != "ada" {
		t.Fatalf("unexpected started machine: %#v", machine)
	}
	if enterCount != 1 || exitCount != 1 || transitionCount != 1 {
		t.Fatalf("unexpected hook counts: enter=%d exit=%d transition=%d", enterCount, exitCount, transitionCount)
	}
	if !machine.Send("refresh", "grace") {
		t.Fatalf("expected same-mode transition to run")
	}
	if !machine.Matches(MachineMode("active")) || machine.Data.LastPlayer != "grace" {
		t.Fatalf("unexpected refreshed machine: %#v", machine)
	}
	if enterCount != 1 || exitCount != 1 || transitionCount != 2 {
		t.Fatalf("unexpected same-mode hook counts: enter=%d exit=%d transition=%d", enterCount, exitCount, transitionCount)
	}

	snapshot := machine.Snapshot()
	machine.Data.Starts = 99
	machine.Restore(snapshot)

	if machine.Current != MachineMode("active") || machine.Data.Starts != 1 || machine.Data.LastPlayer != "grace" {
		t.Fatalf("unexpected restored machine: %#v", machine)
	}
	if machine.Send("missing", "nobody") {
		t.Fatalf("missing transition should return false")
	}
}

func TestMachineFacadeSupportsGuardedTransitionDefinitions(t *testing.T) {
	type sessionData struct {
		Starts     int
		LastPlayer string
	}

	guard := func(data *sessionData, payload string, machine *Machine[sessionData, string]) bool {
		return data.Starts == 0 && payload != "blocked" && machine.Matches(MachineMode("idle"))
	}
	start := func(data *sessionData, payload string, machine *Machine[sessionData, string]) MachineTransitionResult {
		data.Starts++
		data.LastPlayer = payload
		return NextMode(MachineMode("active"))
	}
	descriptor := NewMachineTransitionDescriptor(guard, start)
	definition := descriptor.Definition()

	if !definition.CanRun(&sessionData{}, "ada", &Machine[sessionData, string]{Current: MachineMode("idle")}) {
		t.Fatalf("expected descriptor guard to allow ada")
	}
	if definition.CanRun(&sessionData{}, "blocked", &Machine[sessionData, string]{Current: MachineMode("idle")}) {
		t.Fatalf("expected descriptor guard to block payload")
	}

	config := MachineConfig[sessionData, string]{
		Initial: MachineMode("idle"),
		Data:    sessionData{},
	}.WithTransitionDefinition(MachineMode("idle"), "start", definition)
	machine := NewMachine(config)

	if !machine.Can("start") {
		t.Fatalf("expected guarded transition to be present")
	}
	if machine.CanWithPayload("start", "blocked") {
		t.Fatalf("expected guarded transition to reject blocked payload")
	}
	if machine.Send("start", "blocked") {
		t.Fatalf("blocked transition should not run")
	}
	if !machine.Matches(MachineMode("idle")) || machine.Data.Starts != 0 || machine.Data.LastPlayer != "" {
		t.Fatalf("blocked transition mutated machine: %#v", machine)
	}
	if !machine.CanWithPayload("start", "ada") {
		t.Fatalf("expected guarded transition to allow ada")
	}
	if !machine.Send("start", "ada") {
		t.Fatalf("expected allowed transition to run")
	}
	if !machine.Matches(MachineMode("active")) || machine.Data.Starts != 1 || machine.Data.LastPlayer != "ada" {
		t.Fatalf("unexpected started machine: %#v", machine)
	}
}
