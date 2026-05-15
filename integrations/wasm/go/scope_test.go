package angularwasm

import (
	"reflect"
	"testing"
)

func resetHostStub() {
	hostStub.nextBuffer = 1
	hostStub.nextWatch = 1
	hostStub.resolveName = map[string]uint32{}
	hostStub.getJSON = map[string]string{}
	hostStub.setCalls = nil
	hostStub.watchPaths = map[uint32]string{}
	hostStub.buffers = map[uint32][]byte{}
	watchCallbacks = map[uint32]watchCallback{}
}

func TestScopeSetEncodesJSON(t *testing.T) {
	resetHostStub()

	scope := Scope{Handle: 7}
	if err := scope.Set("todo", map[string]any{"task": "Write API notes", "done": false}); err != nil {
		t.Fatalf("Set returned error: %v", err)
	}

	if len(hostStub.setCalls) != 1 {
		t.Fatalf("expected one set call, got %d", len(hostStub.setCalls))
	}

	call := hostStub.setCalls[0]
	if call.ScopeHandle != 7 || call.Path != "todo" {
		t.Fatalf("unexpected set target: %#v", call)
	}
	if call.Value != `{"done":false,"task":"Write API notes"}` {
		t.Fatalf("unexpected JSON payload: %s", call.Value)
	}
}

func TestScopeGetDecodesJSONAndFreesBuffer(t *testing.T) {
	resetHostStub()
	hostStub.getJSON[hostScopeKey(3, "items")] = `[{"task":"Learn AngularTS"}]`

	var items []map[string]string
	if err := (Scope{Handle: 3}).Get("items", &items); err != nil {
		t.Fatalf("Get returned error: %v", err)
	}

	if !reflect.DeepEqual(items, []map[string]string{{"task": "Learn AngularTS"}}) {
		t.Fatalf("unexpected decoded items: %#v", items)
	}
	if len(hostStub.buffers) != 0 {
		t.Fatalf("expected host result buffer to be freed, got %#v", hostStub.buffers)
	}
}

func TestNamedScopeUsesNameBasedImports(t *testing.T) {
	resetHostStub()

	if err := Named("todoList:main").Set("count", 3); err != nil {
		t.Fatalf("Set returned error: %v", err)
	}

	call := hostStub.setCalls[0]
	if call.ScopeName != "todoList:main" || call.Path != "count" || call.Value != "3" {
		t.Fatalf("unexpected named set call: %#v", call)
	}
}

func TestWatchDispatchesUpdates(t *testing.T) {
	resetHostStub()

	var got Update
	watch := (Scope{Handle: 9}).Watch("count", func(update Update) {
		got = update
	})
	if watch.Handle == 0 {
		t.Fatal("expected watch handle")
	}

	path := []byte("count")
	value := []byte("4")
	ngScopeOnUpdate(9, bytesPointer(path), uint32(len(path)), bytesPointer(value), uint32(len(value)))

	if got.ScopeHandle != 9 || got.Path != "count" || string(got.JSON) != "4" {
		t.Fatalf("unexpected update: %#v", got)
	}

	var count int
	if err := got.Decode(&count); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if count != 4 {
		t.Fatalf("unexpected decoded count: %d", count)
	}

	if !watch.Unwatch() {
		t.Fatal("expected Unwatch to succeed")
	}
}

func TestSyncScopeWritesValuesAndFlushesOnce(t *testing.T) {
	resetHostStub()

	scope := &recordingScope{}
	if err := SyncScope(
		scope,
		ValueAt("items", []string{"one", "two"}),
		ValueAt("remainingCount", 2),
	); err != nil {
		t.Fatalf("SyncScope returned error: %v", err)
	}

	if scope.flushes != 1 {
		t.Fatalf("expected one flush, got %d", scope.flushes)
	}
	if len(scope.values) != 2 {
		t.Fatalf("expected two values, got %#v", scope.values)
	}
	if !reflect.DeepEqual(scope.values["items"], []string{"one", "two"}) {
		t.Fatalf("unexpected items value: %#v", scope.values["items"])
	}
	if scope.values["remainingCount"] != 2 {
		t.Fatalf("unexpected remainingCount: %#v", scope.values["remainingCount"])
	}
}

func TestSyncScopeRejectsInvalidPath(t *testing.T) {
	scope := &recordingScope{}
	if err := SyncScope(scope, ValueAt("", 1)); err != ErrInvalidPath {
		t.Fatalf("expected ErrInvalidPath, got %v", err)
	}
	if scope.flushes != 0 {
		t.Fatalf("expected no flush after invalid path, got %d", scope.flushes)
	}
}

type recordingScope struct {
	values  map[string]any
	flushes int
}

func (s *recordingScope) Set(path string, value any) error {
	if s.values == nil {
		s.values = map[string]any{}
	}

	s.values[path] = value
	return nil
}

func (s *recordingScope) Flush() bool {
	s.flushes++
	return true
}
