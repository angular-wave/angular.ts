package angularwasm

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
)

// TemplateSource describes how AngularTS should load a Go-authored component
// template.
type TemplateSource struct {
	inline string
	url    string
}

// InlineTemplate creates metadata for an inline AngularTS component template.
func InlineTemplate(template string) TemplateSource {
	return TemplateSource{inline: template}
}

// TemplateURL creates metadata for an external AngularTS component template.
func TemplateURL(url string) TemplateSource {
	return TemplateSource{url: url}
}

// Inline returns the inline template text, when this source is inline.
func (s TemplateSource) Inline() string {
	return s.inline
}

// URL returns the external template URL, when this source is URL-backed.
func (s TemplateSource) URL() string {
	return s.url
}

// Validate checks that exactly one template source is configured.
func (s TemplateSource) Validate() error {
	if s.inline == "" && s.url == "" {
		return fmt.Errorf("angular.ts wasm: component template is required")
	}
	if s.inline != "" && s.url != "" {
		return fmt.Errorf("angular.ts wasm: component template must be inline or URL, not both")
	}

	return nil
}

// InjectionToken names one AngularTS dependency and carries the expected Go
// type at compile time.
type InjectionToken[T any] struct {
	name string
}

// Token creates a typed AngularTS dependency injection token.
func Token[T any](name string) InjectionToken[T] {
	return InjectionToken[T]{name: name}
}

// Name returns the AngularTS dependency injection token name.
func (t InjectionToken[T]) Name() string {
	return t.name
}

// InjectionMetadata describes one Go field injection expected by generated
// AngularTS glue.
type InjectionMetadata struct {
	Field  string `json:"field"`
	Token  string `json:"token"`
	GoType string `json:"goType"`
}

// Inject creates metadata for one typed field injection.
func Inject[T any](field string, token InjectionToken[T]) InjectionMetadata {
	return InjectionMetadata{
		Field:  field,
		Token:  token.Name(),
		GoType: goTypeName[T](),
	}
}

// InjectionTokens is the ordered AngularTS DI token list for a registration.
type InjectionTokens []string

// Tokens returns the ordered AngularTS DI token names from injection metadata.
func Tokens(injections ...InjectionMetadata) InjectionTokens {
	tokens := make(InjectionTokens, 0, len(injections))
	for _, injection := range injections {
		tokens = append(tokens, injection.Token)
	}

	return tokens
}

// ScopeField describes one Go-owned value that generated glue may expose on an
// AngularTS scope.
type ScopeField struct {
	Name   string `json:"name"`
	GoName string `json:"goName,omitempty"`
	GoType string `json:"goType,omitempty"`
}

// Field creates scope field metadata for a template-visible value.
func Field(name string) ScopeField {
	return ScopeField{Name: name, GoName: name}
}

// FieldFor creates scope field metadata when the Go field or method name
// differs from the AngularTS scope path.
func FieldFor(name string, goName string) ScopeField {
	return ScopeField{Name: name, GoName: goName}
}

// TypedField creates typed scope field metadata.
func TypedField[T any](name string) ScopeField {
	return ScopeField{Name: name, GoName: name, GoType: goTypeName[T]()}
}

// TypedFieldFor creates typed scope field metadata when the Go field or method
// name differs from the AngularTS scope path.
func TypedFieldFor[T any](name string, goName string) ScopeField {
	return ScopeField{Name: name, GoName: goName, GoType: goTypeName[T]()}
}

// Validate checks whether field metadata can generate AngularTS scope bridge
// code.
func (f ScopeField) Validate() error {
	if f.Name == "" {
		return fmt.Errorf("name is required")
	}
	if f.GoName == "" {
		return fmt.Errorf("Go name is required")
	}

	return nil
}

// ScopeWatchRoute describes one AngularTS scope path that generated glue
// should watch and route into a Go handler.
type ScopeWatchRoute struct {
	Path    string `json:"path"`
	Handler string `json:"handler"`
	GoType  string `json:"goType,omitempty"`
}

// WatchRoute creates scope watch metadata for a template-originated value.
func WatchRoute(path string, handler string) ScopeWatchRoute {
	return ScopeWatchRoute{Path: path, Handler: handler}
}

// TypedWatchRoute creates typed scope watch metadata for a
// template-originated value.
func TypedWatchRoute[T any](path string, handler string) ScopeWatchRoute {
	return ScopeWatchRoute{Path: path, Handler: handler, GoType: goTypeName[T]()}
}

// Validate checks whether watch route metadata can generate AngularTS scope
// watch code.
func (r ScopeWatchRoute) Validate() error {
	if r.Path == "" {
		return fmt.Errorf("path is required")
	}
	if r.Handler == "" {
		return fmt.Errorf("handler is required")
	}

	return nil
}

// Component describes a Go-authored AngularTS component registration.
type Component struct {
	Name       string
	Selector   string
	ExportName string
	GoType     string
	Template   TemplateSource
	ScopeName  string
	Methods    []string
	Fields     []ScopeField
	Watches    []ScopeWatchRoute
	Injections []InjectionMetadata
}

// Controller describes a Go-authored AngularTS controller registration.
type Controller struct {
	Name       string
	ExportName string
	GoType     string
	ScopeName  string
	Methods    []string
	Fields     []ScopeField
	Watches    []ScopeWatchRoute
	Injections []InjectionMetadata
}

// Injectable describes a Go-authored AngularTS injectable registration.
type Injectable struct {
	TokenName  string
	ExportName string
	GoType     string
	Injections []InjectionMetadata
}

// Service describes a Go-authored AngularTS service registration.
type Service struct {
	Injectable
}

// Factory describes a Go-authored AngularTS factory registration.
type Factory struct {
	Injectable
}

// Value describes a Go-authored AngularTS value registration.
type Value struct {
	Injectable
}

// NewComponent creates component metadata for a Go type.
func NewComponent[T any](
	name string,
	selector string,
	exportName string,
	template TemplateSource,
	injections ...InjectionMetadata,
) Component {
	return Component{
		Name:       name,
		Selector:   selector,
		ExportName: exportName,
		GoType:     goTypeName[T](),
		Template:   template,
		Injections: append([]InjectionMetadata(nil), injections...),
	}
}

// WithScopeName sets the stable AngularTS WasmScope name used by this
// component bridge.
func (c Component) WithScopeName(name string) Component {
	c.ScopeName = name
	return c
}

// WithMethods sets the Go methods that generated glue should expose on this
// component scope.
func (c Component) WithMethods(methods ...string) Component {
	c.Methods = append([]string(nil), methods...)
	return c
}

// WithFields sets the Go-owned fields that generated glue should expose on
// this component scope.
func (c Component) WithFields(fields ...ScopeField) Component {
	c.Fields = append([]ScopeField(nil), fields...)
	return c
}

// WithWatchRoutes sets the scope watches that generated glue should route
// into this component.
func (c Component) WithWatchRoutes(routes ...ScopeWatchRoute) Component {
	c.Watches = append([]ScopeWatchRoute(nil), routes...)
	return c
}

// NewController creates controller metadata for a Go type.
func NewController[T any](
	name string,
	exportName string,
	injections ...InjectionMetadata,
) Controller {
	return Controller{
		Name:       name,
		ExportName: exportName,
		GoType:     goTypeName[T](),
		Injections: append([]InjectionMetadata(nil), injections...),
	}
}

// WithScopeName sets the stable AngularTS WasmScope name used by this
// controller bridge.
func (c Controller) WithScopeName(name string) Controller {
	c.ScopeName = name
	return c
}

// WithMethods sets the Go methods that generated glue should expose on this
// controller scope.
func (c Controller) WithMethods(methods ...string) Controller {
	c.Methods = append([]string(nil), methods...)
	return c
}

// WithFields sets the Go-owned fields that generated glue should expose on
// this controller scope.
func (c Controller) WithFields(fields ...ScopeField) Controller {
	c.Fields = append([]ScopeField(nil), fields...)
	return c
}

// WithWatchRoutes sets the scope watches that generated glue should route
// into this controller.
func (c Controller) WithWatchRoutes(routes ...ScopeWatchRoute) Controller {
	c.Watches = append([]ScopeWatchRoute(nil), routes...)
	return c
}

// NewService creates service metadata for a Go type.
func NewService[T any](
	tokenName string,
	exportName string,
	injections ...InjectionMetadata,
) Service {
	return Service{
		Injectable: NewInjectable[T](tokenName, exportName, injections...),
	}
}

// NewFactory creates factory metadata for a Go type.
func NewFactory[T any](
	tokenName string,
	exportName string,
	injections ...InjectionMetadata,
) Factory {
	return Factory{
		Injectable: NewInjectable[T](tokenName, exportName, injections...),
	}
}

// NewValue creates value metadata for a Go type.
func NewValue[T any](tokenName string, exportName string) Value {
	return Value{
		Injectable: NewInjectable[T](tokenName, exportName),
	}
}

// NewInjectable creates common injectable metadata for a Go type.
func NewInjectable[T any](
	tokenName string,
	exportName string,
	injections ...InjectionMetadata,
) Injectable {
	return Injectable{
		TokenName:  tokenName,
		ExportName: exportName,
		GoType:     goTypeName[T](),
		Injections: append([]InjectionMetadata(nil), injections...),
	}
}

// NgModule collects Go-authored AngularTS registrations for generated glue.
type NgModule struct {
	name          string
	registrations []Registration
}

// NewNgModule creates an AngularTS module metadata collector.
func NewNgModule(name string) *NgModule {
	return &NgModule{name: name}
}

// Name returns the AngularTS module name.
func (m *NgModule) Name() string {
	if m == nil {
		return ""
	}

	return m.name
}

// Registrations returns a snapshot of collected AngularTS registrations.
func (m *NgModule) Registrations() []Registration {
	if m == nil {
		return nil
	}

	return append([]Registration(nil), m.registrations...)
}

// Component registers a Go-authored AngularTS component.
func (m *NgModule) Component(component Component) *NgModule {
	return m.push(componentRegistration(component))
}

// Controller registers a Go-authored AngularTS controller.
func (m *NgModule) Controller(controller Controller) *NgModule {
	return m.push(controllerRegistration(controller))
}

// Service registers a Go-authored AngularTS service.
func (m *NgModule) Service(service Service) *NgModule {
	return m.push(injectableRegistration(RegistrationKindService, service.Injectable))
}

// Factory registers a Go-authored AngularTS factory.
func (m *NgModule) Factory(factory Factory) *NgModule {
	return m.push(injectableRegistration(RegistrationKindFactory, factory.Injectable))
}

// Value registers a Go-authored AngularTS value.
func (m *NgModule) Value(value Value) *NgModule {
	return m.push(injectableRegistration(RegistrationKindValue, value.Injectable))
}

// Validate checks that the module and every registration can generate
// AngularTS glue.
func (m *NgModule) Validate() error {
	if m == nil {
		return fmt.Errorf("angular.ts wasm: module is required")
	}
	if m.name == "" {
		return fmt.Errorf("angular.ts wasm: module name is required")
	}

	for index, registration := range m.registrations {
		if err := registration.Validate(); err != nil {
			return fmt.Errorf("angular.ts wasm: invalid registration %d: %w", index, err)
		}
	}

	return nil
}

// ManifestJSON serializes the module metadata consumed by generated
// JavaScript bootstrap code.
func (m *NgModule) ManifestJSON() (string, error) {
	payload, err := m.manifestPayload()
	if err != nil {
		return "", err
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	return string(encoded), nil
}

func (m *NgModule) manifestPayload() (moduleManifest, error) {
	if err := m.Validate(); err != nil {
		return moduleManifest{}, err
	}

	return moduleManifest{
		Registrations: m.registrationManifest(),
	}, nil
}

func (m *NgModule) registrationManifest() []registrationManifest {
	registrations := make([]registrationManifest, 0, len(m.registrations))
	for _, registration := range m.registrations {
		registrations = append(registrations, registration.manifest())
	}

	return registrations
}

// WriteManifestFile writes the module registration manifest used by generated
// JavaScript bootstrap code.
func WriteManifestFile(module *NgModule, path string) error {
	if path == "" {
		return fmt.Errorf("angular.ts wasm: manifest path is required")
	}

	manifest, err := module.ManifestJSON()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	return os.WriteFile(path, []byte(manifest+"\n"), 0o644)
}

func (m *NgModule) push(registration Registration) *NgModule {
	if m == nil {
		return m
	}

	m.registrations = append(m.registrations, registration)
	return m
}

// RegistrationKind identifies the AngularTS registration API generated glue
// should call.
type RegistrationKind string

const (
	// RegistrationKindService registers an AngularTS service.
	RegistrationKindService RegistrationKind = "service"
	// RegistrationKindFactory registers an AngularTS factory.
	RegistrationKindFactory RegistrationKind = "factory"
	// RegistrationKindValue registers an AngularTS value.
	RegistrationKindValue RegistrationKind = "value"
	// RegistrationKindController registers an AngularTS controller.
	RegistrationKindController RegistrationKind = "controller"
	// RegistrationKindComponent registers an AngularTS component.
	RegistrationKindComponent RegistrationKind = "component"
)

// Registration is one AngularTS registration captured from Go metadata.
type Registration struct {
	Kind       RegistrationKind
	Name       string
	ExportName string
	GoType     string
	Selector   string
	Template   TemplateSource
	ScopeName  string
	Methods    []string
	Fields     []ScopeField
	Watches    []ScopeWatchRoute
	Injections []InjectionMetadata
}

// Validate checks whether a registration has the metadata required by
// generated AngularTS glue.
func (r Registration) Validate() error {
	if r.Kind == "" {
		return fmt.Errorf("kind is required")
	}
	if !r.Kind.valid() {
		return fmt.Errorf("unsupported registration kind %q", r.Kind)
	}
	if r.Name == "" {
		return fmt.Errorf("name is required")
	}
	if r.ExportName == "" {
		return fmt.Errorf("export name is required")
	}
	if r.GoType == "" {
		return fmt.Errorf("Go type is required")
	}

	for index, injection := range r.Injections {
		if err := injection.Validate(); err != nil {
			return fmt.Errorf("invalid injection %d: %w", index, err)
		}
	}
	for index, method := range r.Methods {
		if method == "" {
			return fmt.Errorf("method %d is required", index)
		}
		for previous := 0; previous < index; previous++ {
			if r.Methods[previous] == method {
				return fmt.Errorf("method %q is duplicated", method)
			}
		}
	}
	for index, field := range r.Fields {
		if err := field.Validate(); err != nil {
			return fmt.Errorf("invalid field %d: %w", index, err)
		}
		for previous := 0; previous < index; previous++ {
			if r.Fields[previous].Name == field.Name {
				return fmt.Errorf("field %q is duplicated", field.Name)
			}
		}
	}
	for index, watch := range r.Watches {
		if err := watch.Validate(); err != nil {
			return fmt.Errorf("invalid watch route %d: %w", index, err)
		}
		for previous := 0; previous < index; previous++ {
			if r.Watches[previous].Path == watch.Path {
				return fmt.Errorf("watch route %q is duplicated", watch.Path)
			}
		}
	}

	if r.Kind == RegistrationKindComponent {
		if r.Selector == "" {
			return fmt.Errorf("component selector is required")
		}
		if err := r.Template.Validate(); err != nil {
			return err
		}
	}

	return nil
}

// Validate checks whether an injection has enough metadata for generated DI.
func (i InjectionMetadata) Validate() error {
	if i.Field == "" {
		return fmt.Errorf("field is required")
	}
	if i.Token == "" {
		return fmt.Errorf("token is required")
	}
	if i.GoType == "" {
		return fmt.Errorf("Go type is required")
	}

	return nil
}

func componentRegistration(component Component) Registration {
	return Registration{
		Kind:       RegistrationKindComponent,
		Name:       component.Name,
		ExportName: component.ExportName,
		GoType:     component.GoType,
		Selector:   component.Selector,
		Template:   component.Template,
		ScopeName:  component.ScopeName,
		Methods:    append([]string(nil), component.Methods...),
		Fields:     append([]ScopeField(nil), component.Fields...),
		Watches:    append([]ScopeWatchRoute(nil), component.Watches...),
		Injections: append([]InjectionMetadata(nil), component.Injections...),
	}
}

func controllerRegistration(controller Controller) Registration {
	return Registration{
		Kind:       RegistrationKindController,
		Name:       controller.Name,
		ExportName: controller.ExportName,
		GoType:     controller.GoType,
		ScopeName:  controller.ScopeName,
		Methods:    append([]string(nil), controller.Methods...),
		Fields:     append([]ScopeField(nil), controller.Fields...),
		Watches:    append([]ScopeWatchRoute(nil), controller.Watches...),
		Injections: append([]InjectionMetadata(nil), controller.Injections...),
	}
}

func injectableRegistration(kind RegistrationKind, injectable Injectable) Registration {
	return Registration{
		Kind:       kind,
		Name:       injectable.TokenName,
		ExportName: injectable.ExportName,
		GoType:     injectable.GoType,
		Injections: append([]InjectionMetadata(nil), injectable.Injections...),
	}
}

func (r Registration) manifest() registrationManifest {
	manifest := registrationManifest{
		Kind:       string(r.Kind),
		Name:       r.Name,
		ExportName: r.ExportName,
		Inject:     Tokens(r.Injections...),
	}

	if r.Template.Inline() != "" {
		manifest.Template = r.Template.Inline()
	}
	if r.Template.URL() != "" {
		manifest.TemplateURL = r.Template.URL()
	}
	if r.ScopeName != "" {
		manifest.ScopeName = r.ScopeName
	}
	if len(r.Methods) > 0 {
		manifest.Methods = append([]string(nil), r.Methods...)
	}
	if len(r.Fields) > 0 {
		manifest.Fields = append([]ScopeField(nil), r.Fields...)
	}
	if len(r.Watches) > 0 {
		manifest.Watches = append([]ScopeWatchRoute(nil), r.Watches...)
	}

	return manifest
}

func (k RegistrationKind) valid() bool {
	switch k {
	case RegistrationKindService,
		RegistrationKindFactory,
		RegistrationKindValue,
		RegistrationKindController,
		RegistrationKindComponent:
		return true
	default:
		return false
	}
}

type moduleManifest struct {
	Registrations []registrationManifest `json:"registrations"`
}

type registrationManifest struct {
	Kind        string            `json:"kind"`
	Name        string            `json:"name"`
	ExportName  string            `json:"export"`
	Template    string            `json:"template,omitempty"`
	TemplateURL string            `json:"templateUrl,omitempty"`
	ScopeName   string            `json:"scopeName,omitempty"`
	Methods     []string          `json:"methods,omitempty"`
	Fields      []ScopeField      `json:"fields,omitempty"`
	Watches     []ScopeWatchRoute `json:"watches,omitempty"`
	Inject      InjectionTokens   `json:"inject,omitempty"`
}

func goTypeName[T any]() string {
	var value T
	typ := reflect.TypeOf(value)
	if typ == nil {
		return "interface{}"
	}

	return typ.String()
}
