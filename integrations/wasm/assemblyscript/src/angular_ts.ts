type ScopeWatchCallback = (update: ScopeUpdate) => void;

@external("angular_ts", "scope_resolve")
declare function hostScopeResolve(namePtr: usize, nameLen: i32): u32;

@external("angular_ts", "scope_get")
declare function hostScopeGet(
  scopeHandle: u32,
  pathPtr: usize,
  pathLen: i32,
): u32;

@external("angular_ts", "scope_set")
declare function hostScopeSet(
  scopeHandle: u32,
  pathPtr: usize,
  pathLen: i32,
  valuePtr: usize,
  valueLen: i32,
): u32;

@external("angular_ts", "scope_apply")
declare function hostScopeApply(
  scopeHandle: u32,
  transactionPtr: usize,
  transactionLen: i32,
): u32;

@external("angular_ts", "scope_get_binary")
declare function hostScopeGetBinary(
  scopeHandle: u32,
  pathPtr: usize,
  pathLen: i32,
): u32;

@external("angular_ts", "scope_set_binary")
declare function hostScopeSetBinary(
  scopeHandle: u32,
  pathPtr: usize,
  pathLen: i32,
  valuePtr: usize,
  valueLen: i32,
  optionsPtr: usize,
  optionsLen: i32,
): u32;

@external("angular_ts", "scope_delete")
declare function hostScopeDelete(
  scopeHandle: u32,
  pathPtr: usize,
  pathLen: i32,
): u32;

@external("angular_ts", "scope_sync")
declare function hostScopeSync(scopeHandle: u32): u32;

@external("angular_ts", "scope_watch")
declare function hostScopeWatch(
  scopeHandle: u32,
  pathPtr: usize,
  pathLen: i32,
): u32;

@external("angular_ts", "scope_unwatch")
declare function hostScopeUnwatch(watchHandle: u32): u32;

@external("angular_ts", "scope_unbind")
declare function hostScopeUnbind(scopeHandle: u32): u32;

@external("angular_ts", "buffer_ptr")
declare function hostBufferPtr(bufferHandle: u32): usize;

@external("angular_ts", "buffer_len")
declare function hostBufferLen(bufferHandle: u32): i32;

@external("angular_ts", "buffer_free")
declare function hostBufferFree(bufferHandle: u32): void;

@external("angular_ts", "error_code")
declare function hostErrorCode(): u32;

@external("angular_ts", "error_clear")
declare function hostErrorClear(): void;

const callbacks = new Map<string, ScopeWatchCallback>();

class ResultBuffer {
  constructor(public handle: u32) {}

  get ptr(): usize {
    return hostBufferPtr(this.handle);
  }

  get len(): i32 {
    return hostBufferLen(this.handle);
  }

  toString(): string {
    return String.UTF8.decodeUnsafe(this.ptr, this.len, true);
  }

  toBytes(): Uint8Array {
    const value = new Uint8Array(this.len);

    memory.copy(value.dataStart, this.ptr, this.len);

    return value;
  }

  free(): void {
    hostBufferFree(this.handle);
  }
}

export class ScopeUpdate {
  constructor(
    public scopeHandle: u32,
    public path: string,
    public json: string,
  ) {}
}

export class Watch {
  constructor(
    public handle: u32,
    private key: string,
  ) {}

  unwatch(): bool {
    callbacks.delete(this.key);

    return hostScopeUnwatch(this.handle) != 0;
  }
}

export class Scope {
  constructor(public handle: u32) {}

  static named(name: string): Scope {
    const nameBuffer = String.UTF8.encode(name);

    return new Scope(
      hostScopeResolve(changetype<usize>(nameBuffer), nameBuffer.byteLength),
    );
  }

  getJson(path: string): string {
    const pathBuffer = String.UTF8.encode(path);
    const result = new ResultBuffer(
      hostScopeGet(
        this.handle,
        changetype<usize>(pathBuffer),
        pathBuffer.byteLength,
      ),
    );
    const value = result.toString();

    result.free();

    return value;
  }

  setJson(path: string, json: string): bool {
    const pathBuffer = String.UTF8.encode(path);
    const valueBuffer = String.UTF8.encode(json);

    return hostScopeSet(
      this.handle,
      changetype<usize>(pathBuffer),
      pathBuffer.byteLength,
      changetype<usize>(valueBuffer),
      valueBuffer.byteLength,
    ) != 0;
  }

  applyJson(transactionJson: string): bool {
    const transaction = String.UTF8.encode(transactionJson);

    return hostScopeApply(
      this.handle,
      changetype<usize>(transaction),
      transaction.byteLength,
    ) != 0;
  }

  getBytes(path: string): Uint8Array {
    const pathBuffer = String.UTF8.encode(path);
    const result = new ResultBuffer(
      hostScopeGetBinary(
        this.handle,
        changetype<usize>(pathBuffer),
        pathBuffer.byteLength,
      ),
    );
    const value = result.toBytes();

    result.free();

    return value;
  }

  setBytes(path: string, value: Uint8Array, optionsJson: string = ""): bool {
    const pathBuffer = String.UTF8.encode(path);
    const optionsBuffer = String.UTF8.encode(optionsJson);

    return hostScopeSetBinary(
      this.handle,
      changetype<usize>(pathBuffer),
      pathBuffer.byteLength,
      value.dataStart,
      value.byteLength,
      changetype<usize>(optionsBuffer),
      optionsBuffer.byteLength,
    ) != 0;
  }

  errorCode(): u32 {
    return hostErrorCode();
  }

  clearError(): void {
    hostErrorClear();
  }

  delete(path: string): bool {
    const pathBuffer = String.UTF8.encode(path);

    return hostScopeDelete(
      this.handle,
      changetype<usize>(pathBuffer),
      pathBuffer.byteLength,
    ) != 0;
  }

  sync(): bool {
    return hostScopeSync(this.handle) != 0;
  }

  watch(path: string, callback: ScopeWatchCallback): Watch {
    const pathBuffer = String.UTF8.encode(path);
    const handle = hostScopeWatch(
      this.handle,
      changetype<usize>(pathBuffer),
      pathBuffer.byteLength,
    );
    const key = watchKey(this.handle, path);

    callbacks.set(key, callback);

    return new Watch(handle, key);
  }

  unbind(): bool {
    return hostScopeUnbind(this.handle) != 0;
  }
}

export function ng_abi_version(): u32 {
  return 3;
}

export function ng_abi_alloc(size: u32): usize {
  return __pin(__new(size, idof<ArrayBuffer>()));
}

export function ng_abi_free(ptr: usize, _size: u32): void {
  __unpin(ptr);
}

export function ng_scope_on_bind(
  _scopeHandle: u32,
  _namePtr: usize,
  _nameLen: i32,
): void {}

export function ng_scope_on_unbind(scopeHandle: u32): void {
  const prefix = scopeHandle.toString() + ":";
  const keys = callbacks.keys();

  for (let i = 0; i < keys.length; i++) {
    if (keys[i].startsWith(prefix)) {
      callbacks.delete(keys[i]);
    }
  }
}

export function ng_scope_on_transaction(
  scopeHandle: u32,
  transactionPtr: usize,
  transactionLen: i32,
): void {
  const transaction = String.UTF8.decodeUnsafe(
    transactionPtr,
    transactionLen,
    true,
  );
  const prefix = scopeHandle.toString() + ":";
  const keys = callbacks.keys();

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (!key.startsWith(prefix)) continue;

    const path = key.substring(prefix.length);
    const callback = callbacks.get(key);
    const json = transactionValue(transaction, path);

    if (callback && json != null) {
      callback(new ScopeUpdate(scopeHandle, path, json as string));
    }
  }
}

function transactionValue(transaction: string, path: string): string | null {
  const token = '"' + path + '":';
  const start = transaction.indexOf(token);

  if (start >= 0) {
    return readJsonValue(transaction, start + token.length);
  }

  const deleteStart = transaction.indexOf('"delete":[');
  if (
    deleteStart >= 0 &&
    transaction.indexOf('"' + path + '"', deleteStart) >= 0
  ) {
    return "null";
  }

  return null;
}

function readJsonValue(source: string, start: i32): string {
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let index = start; index < source.length; index++) {
    const code = source.charCodeAt(index);

    if (inString) {
      if (escaped) escaped = false;
      else if (code == 92) escaped = true;
      else if (code == 34) inString = false;
      continue;
    }

    if (code == 34) inString = true;
    else if (code == 123 || code == 91) depth++;
    else if (code == 125 || code == 93) {
      if (depth == 0) return source.substring(start, index);
      depth--;
    } else if (code == 44 && depth == 0) {
      return source.substring(start, index);
    }
  }

  return source.substring(start);
}

function watchKey(scopeHandle: u32, path: string): string {
  return scopeHandle.toString() + ":" + path;
}
