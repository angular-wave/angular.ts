package angularwasm

import "testing"

func TestGeneratedNativeCapabilities(t *testing.T) {
	seen := map[NativeCapabilityName]bool{}
	for _, capability := range NativeCapabilityCatalog {
		if seen[capability.Name] {
			t.Fatalf("duplicate native capability %q", capability.Name)
		}
		seen[capability.Name] = true
		if capability.Threading != "main" || capability.Lifecycle != "destination" || capability.ErrorProtocol != "native-bridge-v1" {
			t.Fatalf("unexpected invocation contract for %q: %+v", capability.Name, capability)
		}
	}
	methods := NativeCapabilityConnectivity.Methods()
	if len(methods) != 3 || methods[1] != "watch" {
		t.Fatalf("unexpected connectivity methods: %v", methods)
	}
}
