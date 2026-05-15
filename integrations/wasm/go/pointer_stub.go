//go:build !js || !wasm

package angularwasm

var hostPointers = struct {
	next uint32
	data map[uint32][]byte
}{
	next: 1,
	data: map[uint32][]byte{},
}

func bytesPointer(bytes []byte) uint32 {
	if len(bytes) == 0 {
		return 0
	}

	ptr := hostPointers.next
	hostPointers.next++
	hostPointers.data[ptr] = bytes

	return ptr
}

func bytesAtPointer(ptr uint32, length uint32) []byte {
	data := hostPointers.data[ptr]
	if uint32(len(data)) < length {
		return data
	}

	return data[:length]
}
