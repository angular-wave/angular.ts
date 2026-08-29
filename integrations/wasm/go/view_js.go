//go:build js && wasm

package angularwasm

import (
	"fmt"
	"syscall/js"
)

// ProgrammaticView is a JavaScript-visible component view callback.
type ProgrammaticView = js.Func

// ProgrammaticViewChild is a DOM value returned by a programmatic view.
type ProgrammaticViewChild = js.Value

// ProgrammaticViewPrimitive is a primitive value accepted as a view child.
type ProgrammaticViewPrimitive = js.Value

// ProgrammaticViewPropertyValue is a property value accepted by a tag factory.
type ProgrammaticViewPropertyValue = any

// ProgrammaticViewTag is one JavaScript tag factory.
type ProgrammaticViewTag = js.Value

// ProgrammaticViewContext wraps the context supplied to a component view callback.
type ProgrammaticViewContext struct {
	value js.Value
}

// NewComponentViewContext wraps a JavaScript view context.
func NewComponentViewContext(value js.Value) ProgrammaticViewContext {
	return ProgrammaticViewContext{value: value}
}

// Controller returns the component controller.
func (c ProgrammaticViewContext) Controller() js.Value { return c.value.Get("controller") }

// Scope returns the scope that owns the generated DOM.
func (c ProgrammaticViewContext) Scope() js.Value { return c.value.Get("scope") }

// Host returns the component host element.
func (c ProgrammaticViewContext) Host() js.Value { return c.value.Get("host") }

// Transclude returns the component transclusion callback.
func (c ProgrammaticViewContext) Transclude() js.Value { return c.value.Get("transclude") }

// Value returns the unwrapped JavaScript context.
func (c ProgrammaticViewContext) Value() js.Value { return c.value }

// ProgrammaticViewProperties is a property bag passed to a tag factory.
type ProgrammaticViewProperties map[string]ProgrammaticViewPropertyValue

// ProgrammaticViewTags wraps angular.tags or one namespaced tag collection.
type ProgrammaticViewTags struct {
	value js.Value
}

// Tags resolves the global AngularTS tag collection.
func Tags() (ProgrammaticViewTags, error) {
	angular := js.Global().Get("angular")
	if angular.Type() == js.TypeUndefined || angular.Type() == js.TypeNull {
		return ProgrammaticViewTags{}, fmt.Errorf("angular.ts wasm: global angular runtime is unavailable")
	}
	value := angular.Get("tags")
	if value.Type() != js.TypeFunction {
		return ProgrammaticViewTags{}, fmt.Errorf("angular.ts wasm: angular.tags is unavailable")
	}

	return ProgrammaticViewTags{value: value}, nil
}

// Namespace resolves a namespaced tag collection, such as SVG or MathML.
func (t ProgrammaticViewTags) Namespace(namespaceURI string) ProgrammaticViewTags {
	return ProgrammaticViewTags{value: t.value.Invoke(namespaceURI)}
}

// Tag creates one real DOM element through angular.tags[name].
func (t ProgrammaticViewTags) Tag(
	name string,
	properties ProgrammaticViewProperties,
	children ...ProgrammaticViewChild,
) ProgrammaticViewChild {
	propertyObject := js.Global().Get("Object").New()
	for key, value := range properties {
		propertyObject.Set(key, value)
	}
	arguments := make([]any, 0, len(children)+1)
	arguments = append(arguments, propertyObject)
	for _, child := range children {
		arguments = append(arguments, child)
	}

	return t.value.Get(name).Invoke(arguments...)
}

// Value returns the unwrapped JavaScript tag collection.
func (t ProgrammaticViewTags) Value() js.Value { return t.value }
