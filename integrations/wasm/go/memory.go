package angularwasm

import "unsafe"

var allocations = map[uint32][]byte{}

//export ng_abi_alloc
func ngABIAlloc(size uint32) uint32 {
	if size == 0 {
		size = 1
	}

	buffer := make([]byte, size)
	ptr := uint32(uintptr(unsafe.Pointer(&buffer[0])))
	allocations[ptr] = buffer

	return ptr
}

//export ng_abi_free
func ngABIFree(ptr uint32, size uint32) {
	delete(allocations, ptr)
}

func bytesFromHost(ptr uint32, length uint32) []byte {
	if ptr == 0 || length == 0 {
		return nil
	}

	data := bytesAtPointer(ptr, length)
	out := make([]byte, len(data))
	copy(out, data)

	return out
}

func withString(value string, call func(ptr uint32, length uint32) uint32) uint32 {
	if value == "" {
		return call(0, 0)
	}

	bytes := []byte(value)
	result := call(bytesPointer(bytes), uint32(len(bytes)))
	runtimeKeepAlive(bytes)

	return result
}

func withBytes(bytes []byte, call func(ptr uint32, length uint32) uint32) uint32 {
	if len(bytes) == 0 {
		return call(0, 0)
	}

	result := call(bytesPointer(bytes), uint32(len(bytes)))
	runtimeKeepAlive(bytes)

	return result
}
