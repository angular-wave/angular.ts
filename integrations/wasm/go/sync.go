package angularwasm

// ScopeWriter is the minimal scope surface needed by generated state sync
// helpers.
type ScopeWriter interface {
	// Set writes a JSON-compatible value into a scope path.
	Set(path string, value any) error
	// Flush asks AngularTS to flush queued scope callbacks.
	Flush() bool
}

// ScopeValue is one scope path and JSON-compatible value pair emitted by
// generated state sync helpers.
type ScopeValue struct {
	Path  string
	Value any
}

// Value creates one scope path and value pair for generated state sync.
func ValueAt(path string, value any) ScopeValue {
	return ScopeValue{Path: path, Value: value}
}

// SyncScope writes all values to the provided scope and flushes once after all
// values have been accepted.
func SyncScope(scope ScopeWriter, values ...ScopeValue) error {
	if scope == nil {
		return ErrInvalidScope
	}

	for _, value := range values {
		if value.Path == "" {
			return ErrInvalidPath
		}
		if err := scope.Set(value.Path, value.Value); err != nil {
			return err
		}
	}

	if !scope.Flush() {
		return ErrInvalidScope
	}

	return nil
}
