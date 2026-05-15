//go:build js && wasm

package angularwasm

import "unsafe"

func bytesPointer(bytes []byte) uint32 {
	if len(bytes) == 0 {
		return 0
	}

	return uint32(uintptr(unsafe.Pointer(&bytes[0])))
}

func bytesAtPointer(ptr uint32, length uint32) []byte {
	return unsafe.Slice((*byte)(unsafe.Pointer(uintptr(ptr))), int(length))
}
