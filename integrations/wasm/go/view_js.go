//go:build js && wasm

package angularwasm

import (
	"fmt"
	"syscall/js"
)

// ComponentView is a JavaScript-visible component view callback.
type ComponentView = js.Func

// ComponentViewChild is a DOM value returned by a programmatic view.
type ComponentViewChild = js.Value

// ComponentViewPrimitive is a primitive value accepted as a view child.
type ComponentViewPrimitive = js.Value

// ComponentViewPropertyValue is a property value accepted by a tag factory.
type ComponentViewPropertyValue = any

// ComponentViewTag is one JavaScript tag factory.
type ComponentViewTag = js.Value

// ComponentViewContext wraps the context supplied to a component view callback.
type ComponentViewContext struct {
	value js.Value
}

// NewComponentViewContext wraps a JavaScript view context.
func NewComponentViewContext(value js.Value) ComponentViewContext {
	return ComponentViewContext{value: value}
}

// Controller returns the component controller.
func (c ComponentViewContext) Controller() js.Value { return c.value.Get("controller") }

// Scope returns the scope that owns the generated DOM.
func (c ComponentViewContext) Scope() js.Value { return c.value.Get("scope") }

// Element returns the component host element.
func (c ComponentViewContext) Element() js.Value { return c.value.Get("element") }

// Transclude returns the component transclusion callback.
func (c ComponentViewContext) Transclude() js.Value { return c.value.Get("transclude") }

// Value returns the unwrapped JavaScript context.
func (c ComponentViewContext) Value() js.Value { return c.value }

// ComponentViewProperties is a property bag passed to a tag factory.
type ComponentViewProperties map[string]ComponentViewPropertyValue

// ComponentViewTags wraps angular.tags or one namespaced tag collection.
type ComponentViewTags struct {
	value js.Value
}

// Tags resolves the global AngularTS tag collection.
func Tags() (ComponentViewTags, error) {
	angular := js.Global().Get("angular")
	if angular.Type() == js.TypeUndefined || angular.Type() == js.TypeNull {
		return ComponentViewTags{}, fmt.Errorf("angular.ts wasm: global angular runtime is unavailable")
	}
	value := angular.Get("tags")
	if value.Type() != js.TypeFunction {
		return ComponentViewTags{}, fmt.Errorf("angular.ts wasm: angular.tags is unavailable")
	}

	return ComponentViewTags{value: value}, nil
}

// Namespace resolves a namespaced tag collection, such as SVG or MathML.
func (t ComponentViewTags) Namespace(namespaceURI string) ComponentViewTags {
	return ComponentViewTags{value: t.value.Invoke(namespaceURI)}
}

// Tag creates one real DOM element through angular.tags[name].
func (t ComponentViewTags) Tag(
	name string,
	properties ComponentViewProperties,
	children ...ComponentViewChild,
) ComponentViewChild {
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
func (t ComponentViewTags) Value() js.Value { return t.value }
