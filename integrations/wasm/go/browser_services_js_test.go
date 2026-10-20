//go:build js && wasm

package angularwasm

import (
	"syscall/js"
	"testing"
)

func TestHTTPFetchOptionsPreserveNativeSignal(t *testing.T) {
	for _, credentials := range []HttpCredentials{HttpCredentialsOmit, HttpCredentialsSameOrigin, HttpCredentialsInclude} {
		t.Run(string(credentials), func(t *testing.T) {
			controller := js.Global().Get("AbortController").New()
			signal := controller.Get("signal")
			options := NewRequestShortcutConfig().WithSignal(signal).WithCredentials(credentials).WithTimeout(1200)
			request := GetRequest("/api/items")
			request.HttpRequestOptions = options
			for _, raw := range []js.Value{requestShortcutToJS(options), requestConfigToJS(request)} {
				if !raw.Get("signal").Equal(signal) {
					t.Fatal("request lost native AbortSignal identity")
				}
				if raw.Get("credentials").String() != string(credentials) || raw.Get("timeout").Int() != 1200 {
					t.Fatal("request did not preserve Fetch credentials and numeric timeout")
				}
				for _, key := range []string{"withCredentials", "eventHandlers", "uploadEventHandlers"} {
					if !raw.Get(key).IsUndefined() {
						t.Fatalf("request contains removed option %s", key)
					}
				}
			}
			controller.Call("abort")
			if !requestConfigToJS(request).Get("signal").Get("aborted").Bool() {
				t.Fatal("request signal did not observe cancellation")
			}
		})
	}
}
