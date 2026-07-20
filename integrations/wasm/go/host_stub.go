//go:build !js || !wasm

package angularwasm

type hostSetCall struct {
	ScopeHandle uint32
	Path        string
	Value       string
}

var hostStub = struct {
	nextBuffer  uint32
	nextWatch   uint32
	resolveName map[string]uint32
	getJSON     map[string]string
	setCalls    []hostSetCall
	watchPaths  map[uint32]string
	buffers     map[uint32][]byte
}{
	nextBuffer:  1,
	nextWatch:   1,
	resolveName: map[string]uint32{},
	getJSON:     map[string]string{},
	watchPaths:  map[uint32]string{},
	buffers:     map[uint32][]byte{},
}

func hostScopeResolve(namePtr uint32, nameLen uint32) uint32 {
	return hostStub.resolveName[string(bytesFromHost(namePtr, nameLen))]
}

func hostScopeGet(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32 {
	return hostNewBuffer(hostStub.getJSON[hostScopeKey(scopeHandle, string(bytesFromHost(pathPtr, pathLen)))])
}

func hostScopeSet(scopeHandle uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32) uint32 {
	hostStub.setCalls = append(hostStub.setCalls, hostSetCall{
		ScopeHandle: scopeHandle,
		Path:        string(bytesFromHost(pathPtr, pathLen)),
		Value:       string(bytesFromHost(valuePtr, valueLen)),
	})
	return 1
}

func hostScopeApply(scopeHandle uint32, transactionPtr uint32, transactionLen uint32) uint32 {
	return hostScopeSet(scopeHandle, 0, 0, transactionPtr, transactionLen)
}

func hostScopeGetBinary(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32 {
	return hostScopeGet(scopeHandle, pathPtr, pathLen)
}

func hostScopeSetBinary(scopeHandle uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32, optionsPtr uint32, optionsLen uint32) uint32 {
	return hostScopeSet(scopeHandle, pathPtr, pathLen, valuePtr, valueLen)
}

func hostErrorCode() uint32 { return 0 }

func hostErrorClear() {}

func hostScopeDelete(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32 {
	return 1
}

func hostScopeSync(scopeHandle uint32) uint32 {
	if scopeHandle == 0 {
		return 0
	}
	return 1
}

func hostScopeWatch(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32 {
	handle := hostStub.nextWatch
	hostStub.nextWatch++
	hostStub.watchPaths[handle] = string(bytesFromHost(pathPtr, pathLen))
	return handle
}

func hostScopeUnwatch(watchHandle uint32) uint32 {
	if _, ok := hostStub.watchPaths[watchHandle]; !ok {
		return 0
	}
	delete(hostStub.watchPaths, watchHandle)
	return 1
}

func hostScopeUnbind(scopeHandle uint32) uint32 {
	if scopeHandle == 0 {
		return 0
	}
	return 1
}

func hostBufferPtr(bufferHandle uint32) uint32 {
	buffer := hostStub.buffers[bufferHandle]
	if len(buffer) == 0 {
		return 0
	}
	return bytesPointer(buffer)
}

func hostBufferLen(bufferHandle uint32) uint32 {
	return uint32(len(hostStub.buffers[bufferHandle]))
}

func hostBufferFree(bufferHandle uint32) {
	delete(hostStub.buffers, bufferHandle)
}

func hostNewBuffer(json string) uint32 {
	handle := hostStub.nextBuffer
	hostStub.nextBuffer++
	hostStub.buffers[handle] = []byte(json)
	return handle
}

func hostScopeKey(scopeHandle uint32, path string) string {
	return string(rune(scopeHandle)) + ":" + path
}
