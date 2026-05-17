#include "angular_ts_wasm.h"

#if defined(__wasm__)
#include <stdint.h>
#else
#include <stdlib.h>
#include <string.h>
#endif

#if defined(__wasm__)
#define NG_WASM_IMPORT(name) \
  __attribute__((import_module("angular_ts"), import_name(#name)))
#define NG_WASM_EXPORT(name) __attribute__((export_name(#name)))
#else
#define NG_WASM_IMPORT(name)
#define NG_WASM_EXPORT(name)
#endif

#if defined(__wasm__)
extern uint8_t __heap_base;
static uintptr_t ng_heap_cursor;

static uint32_t ng_wasm_strlen(const char *value) {
  uint32_t len = 0;
  while (value[len] != '\0') {
    ++len;
  }
  return len;
}

static uint8_t *ng_wasm_alloc(uint32_t size) {
  if (size == 0) {
    return NULL;
  }

  if (ng_heap_cursor == 0) {
    ng_heap_cursor = (uintptr_t)&__heap_base;
  }

  ng_heap_cursor = (ng_heap_cursor + 7u) & ~(uintptr_t)7u;
  uint8_t *ptr = (uint8_t *)ng_heap_cursor;
  ng_heap_cursor += size;
  return ptr;
}
#endif

#if defined(__wasm__)
NG_WASM_IMPORT(scope_resolve)
ng_scope_handle_t ng_import_scope_resolve(const uint8_t *name_ptr,
                                          uint32_t name_len);
NG_WASM_IMPORT(scope_get)
ng_buffer_handle_t ng_import_scope_get(ng_scope_handle_t scope_handle,
                                       const uint8_t *path_ptr,
                                       uint32_t path_len);
NG_WASM_IMPORT(scope_get_named)
ng_buffer_handle_t ng_import_scope_get_named(const uint8_t *name_ptr,
                                             uint32_t name_len,
                                             const uint8_t *path_ptr,
                                             uint32_t path_len);
NG_WASM_IMPORT(scope_set)
uint32_t ng_import_scope_set(ng_scope_handle_t scope_handle,
                             const uint8_t *path_ptr, uint32_t path_len,
                             const uint8_t *value_ptr, uint32_t value_len);
NG_WASM_IMPORT(scope_set_named)
uint32_t ng_import_scope_set_named(const uint8_t *name_ptr, uint32_t name_len,
                                   const uint8_t *path_ptr, uint32_t path_len,
                                   const uint8_t *value_ptr,
                                   uint32_t value_len);
NG_WASM_IMPORT(scope_delete)
uint32_t ng_import_scope_delete(ng_scope_handle_t scope_handle,
                                const uint8_t *path_ptr, uint32_t path_len);
NG_WASM_IMPORT(scope_delete_named)
uint32_t ng_import_scope_delete_named(const uint8_t *name_ptr,
                                      uint32_t name_len,
                                      const uint8_t *path_ptr,
                                      uint32_t path_len);
NG_WASM_IMPORT(scope_sync)
uint32_t ng_import_scope_sync(ng_scope_handle_t scope_handle);
NG_WASM_IMPORT(scope_sync_named)
uint32_t ng_import_scope_sync_named(const uint8_t *name_ptr,
                                    uint32_t name_len);
NG_WASM_IMPORT(scope_watch)
ng_watch_handle_t ng_import_scope_watch(ng_scope_handle_t scope_handle,
                                        const uint8_t *path_ptr,
                                        uint32_t path_len);
NG_WASM_IMPORT(scope_watch_named)
ng_watch_handle_t ng_import_scope_watch_named(const uint8_t *name_ptr,
                                              uint32_t name_len,
                                              const uint8_t *path_ptr,
                                              uint32_t path_len);
NG_WASM_IMPORT(scope_unwatch)
uint32_t ng_import_scope_unwatch(ng_watch_handle_t watch_handle);
NG_WASM_IMPORT(scope_unbind)
uint32_t ng_import_scope_unbind(ng_scope_handle_t scope_handle);
NG_WASM_IMPORT(scope_unbind_named)
uint32_t ng_import_scope_unbind_named(const uint8_t *name_ptr,
                                      uint32_t name_len);
NG_WASM_IMPORT(buffer_ptr)
const uint8_t *ng_import_buffer_ptr(ng_buffer_handle_t buffer_handle);
NG_WASM_IMPORT(buffer_len)
uint32_t ng_import_buffer_len(ng_buffer_handle_t buffer_handle);
NG_WASM_IMPORT(buffer_free)
void ng_import_buffer_free(ng_buffer_handle_t buffer_handle);
#else
static ng_buffer_handle_t test_buffer_handle;
static ng_bytes_t test_buffer_value;
static uint32_t test_buffer_free_count;
static ng_buffer_handle_t test_freed_buffer;

static ng_scope_handle_t ng_import_scope_resolve(const uint8_t *name_ptr,
                                                 uint32_t name_len) {
  (void)name_ptr;
  (void)name_len;
  return 0;
}
static ng_buffer_handle_t ng_import_scope_get(ng_scope_handle_t scope_handle,
                                              const uint8_t *path_ptr,
                                              uint32_t path_len) {
  (void)scope_handle;
  (void)path_ptr;
  (void)path_len;
  return 0;
}
static ng_buffer_handle_t ng_import_scope_get_named(const uint8_t *name_ptr,
                                                    uint32_t name_len,
                                                    const uint8_t *path_ptr,
                                                    uint32_t path_len) {
  (void)name_ptr;
  (void)name_len;
  (void)path_ptr;
  (void)path_len;
  return 0;
}
static uint32_t ng_import_scope_set(ng_scope_handle_t scope_handle,
                                    const uint8_t *path_ptr,
                                    uint32_t path_len,
                                    const uint8_t *value_ptr,
                                    uint32_t value_len) {
  (void)scope_handle;
  (void)path_ptr;
  (void)path_len;
  (void)value_ptr;
  (void)value_len;
  return 0;
}
static uint32_t ng_import_scope_set_named(const uint8_t *name_ptr,
                                          uint32_t name_len,
                                          const uint8_t *path_ptr,
                                          uint32_t path_len,
                                          const uint8_t *value_ptr,
                                          uint32_t value_len) {
  (void)name_ptr;
  (void)name_len;
  (void)path_ptr;
  (void)path_len;
  (void)value_ptr;
  (void)value_len;
  return 0;
}
static uint32_t ng_import_scope_delete(ng_scope_handle_t scope_handle,
                                       const uint8_t *path_ptr,
                                       uint32_t path_len) {
  (void)scope_handle;
  (void)path_ptr;
  (void)path_len;
  return 0;
}
static uint32_t ng_import_scope_delete_named(const uint8_t *name_ptr,
                                             uint32_t name_len,
                                             const uint8_t *path_ptr,
                                             uint32_t path_len) {
  (void)name_ptr;
  (void)name_len;
  (void)path_ptr;
  (void)path_len;
  return 0;
}
static uint32_t ng_import_scope_sync(ng_scope_handle_t scope_handle) {
  (void)scope_handle;
  return 0;
}
static uint32_t ng_import_scope_sync_named(const uint8_t *name_ptr,
                                           uint32_t name_len) {
  (void)name_ptr;
  (void)name_len;
  return 0;
}
static ng_watch_handle_t ng_import_scope_watch(ng_scope_handle_t scope_handle,
                                               const uint8_t *path_ptr,
                                               uint32_t path_len) {
  (void)scope_handle;
  (void)path_ptr;
  (void)path_len;
  return 0;
}
static ng_watch_handle_t ng_import_scope_watch_named(const uint8_t *name_ptr,
                                                     uint32_t name_len,
                                                     const uint8_t *path_ptr,
                                                     uint32_t path_len) {
  (void)name_ptr;
  (void)name_len;
  (void)path_ptr;
  (void)path_len;
  return 0;
}
static uint32_t ng_import_scope_unwatch(ng_watch_handle_t watch_handle) {
  (void)watch_handle;
  return 0;
}
static uint32_t ng_import_scope_unbind(ng_scope_handle_t scope_handle) {
  (void)scope_handle;
  return 0;
}
static uint32_t ng_import_scope_unbind_named(const uint8_t *name_ptr,
                                             uint32_t name_len) {
  (void)name_ptr;
  (void)name_len;
  return 0;
}
static const uint8_t *ng_import_buffer_ptr(ng_buffer_handle_t buffer_handle) {
  if (buffer_handle == test_buffer_handle) {
    return test_buffer_value.ptr;
  }
  return NULL;
}
static uint32_t ng_import_buffer_len(ng_buffer_handle_t buffer_handle) {
  if (buffer_handle == test_buffer_handle) {
    return test_buffer_value.len;
  }
  return 0;
}
static void ng_import_buffer_free(ng_buffer_handle_t buffer_handle) {
  test_freed_buffer = buffer_handle;
  ++test_buffer_free_count;
}

void ng_test_reset_host(void) {
  test_buffer_handle = 0;
  test_buffer_value.ptr = NULL;
  test_buffer_value.len = 0;
  test_buffer_free_count = 0;
  test_freed_buffer = 0;
}

void ng_test_set_buffer(ng_buffer_handle_t buffer_handle, ng_bytes_t value) {
  test_buffer_handle = buffer_handle;
  test_buffer_value = value;
}

uint32_t ng_test_buffer_free_count(void) { return test_buffer_free_count; }

ng_buffer_handle_t ng_test_freed_buffer(void) {
  return test_freed_buffer;
}
#endif

static ng_scope_bind_callback_t bind_callback;
static ng_scope_unbind_callback_t unbind_callback;
static ng_scope_update_callback_t update_callback;

static bool ng_status(uint32_t value) { return value != 0; }

ng_bytes_t ng_bytes_view(const void *ptr, uint32_t len) {
  ng_bytes_t bytes = {(const uint8_t *)ptr, len};
  return bytes;
}

ng_bytes_t ng_bytes_from_cstr(const char *value) {
  if (value == NULL) {
    return ng_bytes_view(NULL, 0);
  }

#if defined(__wasm__)
  return ng_bytes_view(value, ng_wasm_strlen(value));
#else
  return ng_bytes_view(value, (uint32_t)strlen(value));
#endif
}

ng_scope_ref_t ng_scope_ref_from_handle(ng_scope_handle_t handle) {
  ng_scope_ref_t ref = {handle, ng_bytes_view(NULL, 0)};
  return ref;
}

ng_scope_ref_t ng_scope_ref_from_name(ng_bytes_t name) {
  ng_scope_ref_t ref = {0, name};
  return ref;
}

bool ng_scope_ref_valid(ng_scope_ref_t scope) {
  return scope.handle != 0 || scope.name.len != 0;
}

bool ng_scope_ref_named(ng_scope_ref_t scope) {
  return scope.handle == 0 && scope.name.len != 0;
}

ng_scope_ref_t ng_scope_resolve_name(ng_bytes_t name) {
  if (name.len == 0) {
    return ng_scope_ref_from_handle(0);
  }

  return ng_scope_ref_from_handle(ng_import_scope_resolve(name.ptr, name.len));
}

ng_buffer_handle_t ng_scope_get_json(ng_scope_ref_t scope, ng_bytes_t path) {
  if (!ng_scope_ref_valid(scope) || path.len == 0) {
    return 0;
  }

  if (ng_scope_ref_named(scope)) {
    return ng_import_scope_get_named(scope.name.ptr, scope.name.len, path.ptr,
                                     path.len);
  }

  return ng_import_scope_get(scope.handle, path.ptr, path.len);
}

bool ng_scope_set_json(ng_scope_ref_t scope, ng_bytes_t path, ng_bytes_t json) {
  if (!ng_scope_ref_valid(scope) || path.len == 0) {
    return false;
  }

  if (ng_scope_ref_named(scope)) {
    return ng_status(ng_import_scope_set_named(
        scope.name.ptr, scope.name.len, path.ptr, path.len, json.ptr,
        json.len));
  }

  return ng_status(
      ng_import_scope_set(scope.handle, path.ptr, path.len, json.ptr, json.len));
}

bool ng_scope_delete_path(ng_scope_ref_t scope, ng_bytes_t path) {
  if (!ng_scope_ref_valid(scope) || path.len == 0) {
    return false;
  }

  if (ng_scope_ref_named(scope)) {
    return ng_status(ng_import_scope_delete_named(scope.name.ptr,
                                                  scope.name.len, path.ptr,
                                                  path.len));
  }

  return ng_status(ng_import_scope_delete(scope.handle, path.ptr, path.len));
}

bool ng_scope_sync_ref(ng_scope_ref_t scope) {
  if (!ng_scope_ref_valid(scope)) {
    return false;
  }

  if (ng_scope_ref_named(scope)) {
    return ng_status(ng_import_scope_sync_named(scope.name.ptr, scope.name.len));
  }

  return ng_status(ng_import_scope_sync(scope.handle));
}

ng_watch_handle_t ng_scope_watch_path(ng_scope_ref_t scope, ng_bytes_t path) {
  if (!ng_scope_ref_valid(scope) || path.len == 0) {
    return 0;
  }

  if (ng_scope_ref_named(scope)) {
    return ng_import_scope_watch_named(scope.name.ptr, scope.name.len, path.ptr,
                                       path.len);
  }

  return ng_import_scope_watch(scope.handle, path.ptr, path.len);
}

bool ng_scope_unwatch_handle(ng_watch_handle_t watch_handle) {
  if (watch_handle == 0) {
    return false;
  }

  return ng_status(ng_import_scope_unwatch(watch_handle));
}

bool ng_scope_unbind_ref(ng_scope_ref_t scope) {
  if (!ng_scope_ref_valid(scope)) {
    return false;
  }

  if (ng_scope_ref_named(scope)) {
    return ng_status(
        ng_import_scope_unbind_named(scope.name.ptr, scope.name.len));
  }

  return ng_status(ng_import_scope_unbind(scope.handle));
}

const uint8_t *ng_buffer_data(ng_buffer_handle_t buffer_handle) {
  if (buffer_handle == 0) {
    return NULL;
  }

  return ng_import_buffer_ptr(buffer_handle);
}

uint32_t ng_buffer_size(ng_buffer_handle_t buffer_handle) {
  if (buffer_handle == 0) {
    return 0;
  }

  return ng_import_buffer_len(buffer_handle);
}

void ng_buffer_release(ng_buffer_handle_t buffer_handle) {
  if (buffer_handle != 0) {
    ng_import_buffer_free(buffer_handle);
  }
}

void ng_set_scope_bind_callback(ng_scope_bind_callback_t callback) {
  bind_callback = callback;
}

void ng_set_scope_unbind_callback(ng_scope_unbind_callback_t callback) {
  unbind_callback = callback;
}

void ng_set_scope_update_callback(ng_scope_update_callback_t callback) {
  update_callback = callback;
}

NG_WASM_EXPORT(ng_abi_alloc)
uint8_t *ng_abi_alloc(uint32_t size) {
#if defined(__wasm__)
  return ng_wasm_alloc(size);
#else
  return (uint8_t *)malloc(size);
#endif
}

NG_WASM_EXPORT(ng_abi_free)
void ng_abi_free(uint8_t *ptr, uint32_t size) {
  (void)size;
#if defined(__wasm__)
  (void)ptr;
#else
  free(ptr);
#endif
}

NG_WASM_EXPORT(ng_scope_on_bind)
void ng_scope_on_bind(ng_scope_handle_t scope_handle, const uint8_t *name_ptr,
                      uint32_t name_len) {
  if (bind_callback != NULL) {
    bind_callback(scope_handle, ng_bytes_view(name_ptr, name_len));
  }
}

NG_WASM_EXPORT(ng_scope_on_unbind)
void ng_scope_on_unbind(ng_scope_handle_t scope_handle) {
  if (unbind_callback != NULL) {
    unbind_callback(scope_handle);
  }
}

NG_WASM_EXPORT(ng_scope_on_update)
void ng_scope_on_update(ng_scope_handle_t scope_handle,
                        const uint8_t *path_ptr, uint32_t path_len,
                        const uint8_t *value_ptr, uint32_t value_len) {
  if (update_callback != NULL) {
    ng_scope_update_t update = {
        scope_handle,
        ng_bytes_view(path_ptr, path_len),
        ng_bytes_view(value_ptr, value_len),
    };
    update_callback(update);
  }
}

#undef NG_WASM_IMPORT
#undef NG_WASM_EXPORT
