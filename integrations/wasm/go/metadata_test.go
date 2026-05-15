package angularwasm

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type metadataTodoStore struct{}

type metadataTodoList struct{}

type metadataDemoInfo struct{}

func TestNgModuleManifestJSON(t *testing.T) {
	module := basicAppBootstrapModule()
	got, err := module.ManifestJSON()
	if err != nil {
		t.Fatalf("ManifestJSON returned error: %v", err)
	}

	assertFileSnapshot(t, "testdata/basic_app_manifest.snapshot.json", got)
}

func TestTypedInjectionTokenCapturesGoType(t *testing.T) {
	token := Token[metadataTodoStore]("todoStore")
	injection := Inject[metadataTodoStore]("store", token)

	if injection.Field != "store" {
		t.Fatalf("unexpected field: %s", injection.Field)
	}
	if injection.Token != "todoStore" {
		t.Fatalf("unexpected token: %s", injection.Token)
	}
	if !strings.Contains(injection.GoType, "metadataTodoStore") {
		t.Fatalf("unexpected Go type: %s", injection.GoType)
	}
}

func assertFileSnapshot(t *testing.T, path string, got string) {
	t.Helper()

	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read snapshot %s: %v", path, err)
	}
	if strings.TrimRight(string(want), "\n") != strings.TrimRight(got, "\n") {
		t.Fatalf("snapshot mismatch for %s:\nwant %s\ngot  %s", path, want, got)
	}
}

func TestNgModuleValidateRejectsInvalidComponent(t *testing.T) {
	module := NewNgModule("goDemo")
	module.Component(NewComponent[metadataTodoList](
		"todoList",
		"",
		"__ng_component_TodoList",
		TemplateURL("templates/todo-list.html"),
	))

	if _, err := module.ManifestJSON(); err == nil {
		t.Fatal("expected invalid component error")
	}
}

func TestNgModuleValidateRejectsUnsupportedRegistrationKind(t *testing.T) {
	module := NewNgModule("goDemo")
	module.push(Registration{
		Kind:       RegistrationKind("directive"),
		Name:       "demoDirective",
		ExportName: "__ng_directive_Demo",
		GoType:     "Demo",
	})

	if _, err := module.ManifestJSON(); err == nil {
		t.Fatal("expected unsupported registration kind error")
	}
}

func TestNgModuleValidateRejectsDuplicateMethods(t *testing.T) {
	module := NewNgModule("goDemo")
	module.Controller(NewController[metadataDemoInfo](
		"demoInfo",
		"__ng_controller_DemoInfo",
	).WithMethods("save", "save"))

	if _, err := module.ManifestJSON(); err == nil {
		t.Fatal("expected duplicate method error")
	}
}

func TestNgModuleValidateRejectsDuplicateFields(t *testing.T) {
	module := NewNgModule("goDemo")
	module.Controller(NewController[metadataDemoInfo](
		"demoInfo",
		"__ng_controller_DemoInfo",
	).WithFields(Field("title"), Field("title")))

	if _, err := module.ManifestJSON(); err == nil {
		t.Fatal("expected duplicate field error")
	}
}

func TestTypedScopeFieldCapturesGoType(t *testing.T) {
	field := TypedFieldFor[metadataTodoStore]("store", "Store")

	if field.Name != "store" {
		t.Fatalf("unexpected field name: %s", field.Name)
	}
	if field.GoName != "Store" {
		t.Fatalf("unexpected Go name: %s", field.GoName)
	}
	if !strings.Contains(field.GoType, "metadataTodoStore") {
		t.Fatalf("unexpected Go type: %s", field.GoType)
	}
}

func TestTypedWatchRouteCapturesGoType(t *testing.T) {
	route := TypedWatchRoute[string]("newTodo", "onNewTodoChanged")

	if route.Path != "newTodo" {
		t.Fatalf("unexpected watch path: %s", route.Path)
	}
	if route.Handler != "onNewTodoChanged" {
		t.Fatalf("unexpected watch handler: %s", route.Handler)
	}
	if route.GoType != "string" {
		t.Fatalf("unexpected watch Go type: %s", route.GoType)
	}
}

func TestNgModuleValidateRejectsDuplicateWatchRoutes(t *testing.T) {
	module := NewNgModule("goDemo")
	module.Controller(NewController[metadataDemoInfo](
		"demoInfo",
		"__ng_controller_DemoInfo",
	).WithWatchRoutes(
		WatchRoute("title", "onTitle"),
		WatchRoute("title", "onTitleAgain"),
	))

	if _, err := module.ManifestJSON(); err == nil {
		t.Fatal("expected duplicate watch route error")
	}
}

func TestRegistrationsReturnsSnapshot(t *testing.T) {
	module := NewNgModule("goDemo")
	module.Value(NewValue[string]("appTitle", "__ng_value_AppTitle"))

	registrations := module.Registrations()
	registrations[0].Name = "changed"

	if got := module.Registrations()[0].Name; got != "appTitle" {
		t.Fatalf("module registrations were mutated through snapshot: %s", got)
	}
}

func TestWriteManifestFile(t *testing.T) {
	module := NewNgModule("goDemo")
	module.Value(NewValue[string]("appTitle", "__ng_value_AppTitle"))

	path := filepath.Join(t.TempDir(), "angular-ts.json")
	if err := WriteManifestFile(module, path); err != nil {
		t.Fatalf("WriteManifestFile returned error: %v", err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read manifest: %v", err)
	}

	want := "{\"registrations\":[{\"kind\":\"value\",\"name\":\"appTitle\",\"export\":\"__ng_value_AppTitle\"}]}\n"
	if string(got) != want {
		t.Fatalf("unexpected manifest file:\nwant %s\ngot  %s", want, got)
	}
}
