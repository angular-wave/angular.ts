/** Atomically increments one i32 cell in imported shared WebAssembly memory. */
export function increment(index: i32): i32 {
  return atomic.add<i32>(index << 2, 1) + 1;
}

/** Atomically reads one i32 cell from imported shared WebAssembly memory. */
export function read(index: i32): i32 {
  return atomic.load<i32>(index << 2);
}
