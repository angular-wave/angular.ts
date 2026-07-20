import {
  Scope,
  Watch,
  ScopeUpdate,
  ng_abi_version as facadeAbiVersion,
  ng_abi_alloc as facadeAbiAlloc,
  ng_abi_free as facadeAbiFree,
  ng_scope_on_bind as facadeScopeOnBind,
  ng_scope_on_unbind as facadeScopeOnUnbind,
  ng_scope_on_transaction as facadeScopeOnTransaction,
} from "../../src/angular_ts";

class Todo {
  constructor(
    public task: string,
    public done: bool = false,
  ) {}
}

const maxItems = 8;
const scopeName = "assemblyScriptTodo:main";
const items = new Array<Todo>();

let scope = new Scope(0);
let watch = new Watch(0, "");
let newTodo = "";

export function todo_bind(): void {
  scope = Scope.named(scopeName);
  watch = scope.watch("newTodo", onScopeUpdate);

  items.length = 0;
  items.push(new Todo("Learn AngularTS"));
  items.push(new Todo("Build an AssemblyScript Wasm app"));
  newTodo = "";

  sync();
}

export function todo_add(titlePtr: usize, titleLen: i32): void {
  const title = String.UTF8.decodeUnsafe(titlePtr, titleLen, true).trim();

  if (title.length == 0 || items.length >= maxItems) {
    return;
  }

  items.push(new Todo(title));
  newTodo = "";
  sync();
}

export function todo_toggle(index: i32): void {
  if (index < 0 || index >= items.length) {
    return;
  }

  items[index].done = !items[index].done;
  sync();
}

export function todo_archive_completed(): void {
  const kept = new Array<Todo>();

  for (let i = 0; i < items.length; i++) {
    if (!items[i].done) {
      kept.push(items[i]);
    }
  }

  items.length = 0;

  for (let i = 0; i < kept.length; i++) {
    items.push(kept[i]);
  }

  sync();
}

export function todo_unbind(): void {
  watch.unwatch();
  scope.unbind();
}

export function todo_item_count(): i32 {
  return items.length;
}

export function todo_remaining_count(): i32 {
  return remainingCount();
}

export function ng_abi_alloc(size: u32): usize {
  return facadeAbiAlloc(size);
}

export function ng_abi_version(): u32 {
  return facadeAbiVersion();
}

export function ng_abi_free(ptr: usize, size: u32): void {
  facadeAbiFree(ptr, size);
}

export function ng_scope_on_bind(
  scopeHandle: u32,
  namePtr: usize,
  nameLen: i32,
): void {
  facadeScopeOnBind(scopeHandle, namePtr, nameLen);
}

export function ng_scope_on_unbind(scopeHandle: u32): void {
  facadeScopeOnUnbind(scopeHandle);
}

export function ng_scope_on_transaction(
  scopeHandle: u32,
  transactionPtr: usize,
  transactionLen: i32,
): void {
  facadeScopeOnTransaction(scopeHandle, transactionPtr, transactionLen);
}

function onScopeUpdate(update: ScopeUpdate): void {
  if (update.path != "newTodo") {
    return;
  }

  newTodo = decodeFlatJsonString(update.json);
}

function sync(): void {
  scope.setJson("items", itemsJson());
  scope.setJson("remainingCount", remainingCount().toString());
  scope.setJson("newTodo", jsonString(newTodo));
  scope.sync();
}

function remainingCount(): i32 {
  let count = 0;

  for (let i = 0; i < items.length; i++) {
    if (!items[i].done) {
      count += 1;
    }
  }

  return count;
}

function itemsJson(): string {
  const parts = new Array<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    parts.push(
      '{"task":' + jsonString(item.task) + ',"done":' + (item.done ? "true" : "false") + "}",
    );
  }

  return "[" + parts.join(",") + "]";
}

function jsonString(value: string): string {
  let result = '"';

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);

    if (code == 0x22 || code == 0x5c) {
      result += "\\";
    }

    result += String.fromCharCode(code);
  }

  return result + '"';
}

function decodeFlatJsonString(value: string): string {
  if (value.length >= 2 && value.charCodeAt(0) == 0x22) {
    return value.substring(1, value.length - 1);
  }

  return value;
}
