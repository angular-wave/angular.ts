package angularwasm

import "runtime"

func runtimeKeepAlive(value any) {
	runtime.KeepAlive(value)
}
