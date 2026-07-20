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
NG_WASM_IMPORT(scope_set)
uint32_t ng_import_scope_set(ng_scope_handle_t scope_handle,
                             const uint8_t *path_ptr, uint32_t path_len,
                             const uint8_t *value_ptr, uint32_t value_len);
NG_WASM_IMPORT(scope_apply)
uint32_t ng_import_scope_apply(ng_scope_handle_t scope_handle,
                               const uint8_t *transaction_ptr,
                               uint32_t transaction_len);
NG_WASM_IMPORT(scope_get_binary)
ng_buffer_handle_t ng_import_scope_get_binary(ng_scope_handle_t scope_handle,
                                              const uint8_t *path_ptr,
                                              uint32_t path_len);
NG_WASM_IMPORT(scope_set_binary)
uint32_t ng_import_scope_set_binary(
    ng_scope_handle_t scope_handle, const uint8_t *path_ptr, uint32_t path_len,
    const uint8_t *value_ptr, uint32_t value_len,
    const uint8_t *options_ptr, uint32_t options_len);
NG_WASM_IMPORT(scope_delete)
uint32_t ng_import_scope_delete(ng_scope_handle_t scope_handle,
                                const uint8_t *path_ptr, uint32_t path_len);
NG_WASM_IMPORT(scope_sync)
uint32_t ng_import_scope_sync(ng_scope_handle_t scope_handle);
NG_WASM_IMPORT(scope_watch)
ng_watch_handle_t ng_import_scope_watch(ng_scope_handle_t scope_handle,
                                        const uint8_t *path_ptr,
                                        uint32_t path_len);
NG_WASM_IMPORT(scope_unwatch)
uint32_t ng_import_scope_unwatch(ng_watch_handle_t watch_handle);
NG_WASM_IMPORT(scope_unbind)
uint32_t ng_import_scope_unbind(ng_scope_handle_t scope_handle);
NG_WASM_IMPORT(buffer_ptr)
const uint8_t *ng_import_buffer_ptr(ng_buffer_handle_t buffer_handle);
NG_WASM_IMPORT(buffer_len)
uint32_t ng_import_buffer_len(ng_buffer_handle_t buffer_handle);
NG_WASM_IMPORT(buffer_free)
void ng_import_buffer_free(ng_buffer_handle_t buffer_handle);
NG_WASM_IMPORT(error_code)
uint32_t ng_import_error_code(void);
NG_WASM_IMPORT(error_clear)
void ng_import_error_clear(void);
#else
static ng_buffer_handle_t test_buffer_handle;
static ng_bytes_t test_buffer_value;
static uint32_t test_buffer_free_count;
static ng_buffer_handle_t test_freed_buffer;
static ng_bytes_t test_last_transaction;
static ng_watch_handle_t test_next_watch_handle = 9;

static ng_scope_handle_t ng_import_scope_resolve(const uint8_t *name_ptr,
                                                 uint32_t name_len) {
  (void)name_ptr;
  (void)name_len;
  return name_len == 0 ? 0 : 12;
}
static ng_buffer_handle_t ng_import_scope_get(ng_scope_handle_t scope_handle,
                                              const uint8_t *path_ptr,
                                              uint32_t path_len) {
  (void)path_ptr;
  return scope_handle != 0 && path_len != 0 ? test_buffer_handle : 0;
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
  return scope_handle != 0 && path_len != 0 && value_len != 0;
}
static uint32_t ng_import_scope_apply(ng_scope_handle_t scope_handle,
                                      const uint8_t *transaction_ptr,
                                      uint32_t transaction_len) {
  (void)scope_handle;
  test_last_transaction = ng_bytes_view(transaction_ptr, transaction_len);
  return scope_handle != 0 && transaction_len != 0;
}
static ng_buffer_handle_t
ng_import_scope_get_binary(ng_scope_handle_t scope_handle,
                           const uint8_t *path_ptr, uint32_t path_len) {
  return ng_import_scope_get(scope_handle, path_ptr, path_len);
}
static uint32_t ng_import_scope_set_binary(
    ng_scope_handle_t scope_handle, const uint8_t *path_ptr, uint32_t path_len,
    const uint8_t *value_ptr, uint32_t value_len,
    const uint8_t *options_ptr, uint32_t options_len) {
  (void)scope_handle;
  (void)path_ptr;
  (void)path_len;
  (void)value_ptr;
  (void)value_len;
  (void)options_ptr;
  (void)options_len;
  return scope_handle != 0 && path_len != 0;
}
static uint32_t ng_import_scope_delete(ng_scope_handle_t scope_handle,
                                       const uint8_t *path_ptr,
                                       uint32_t path_len) {
  (void)scope_handle;
  (void)path_ptr;
  (void)path_len;
  return scope_handle != 0 && path_len != 0;
}
static uint32_t ng_import_scope_sync(ng_scope_handle_t scope_handle) {
  (void)scope_handle;
  return scope_handle != 0;
}
static ng_watch_handle_t ng_import_scope_watch(ng_scope_handle_t scope_handle,
                                               const uint8_t *path_ptr,
                                               uint32_t path_len) {
  (void)path_ptr;
  return scope_handle != 0 && path_len != 0 ? test_next_watch_handle++ : 0;
}
static uint32_t ng_import_scope_unwatch(ng_watch_handle_t watch_handle) {
  (void)watch_handle;
  return watch_handle != 0;
}
static uint32_t ng_import_scope_unbind(ng_scope_handle_t scope_handle) {
  (void)scope_handle;
  return scope_handle != 0;
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
static uint32_t ng_import_error_code(void) { return 0; }
static void ng_import_error_clear(void) {}

void ng_test_reset_host(void) {
  test_buffer_handle = 0;
  test_buffer_value.ptr = NULL;
  test_buffer_value.len = 0;
  test_buffer_free_count = 0;
  test_freed_buffer = 0;
  test_last_transaction = ng_bytes_view(NULL, 0);
  test_next_watch_handle = 9;
}

void ng_test_set_buffer(ng_buffer_handle_t buffer_handle, ng_bytes_t value) {
  test_buffer_handle = buffer_handle;
  test_buffer_value = value;
}

uint32_t ng_test_buffer_free_count(void) { return test_buffer_free_count; }

ng_buffer_handle_t ng_test_freed_buffer(void) {
  return test_freed_buffer;
}

ng_bytes_t ng_test_last_transaction(void) { return test_last_transaction; }
#endif

static ng_scope_bind_callback_t bind_callback;
static ng_scope_unbind_callback_t unbind_callback;
static ng_scope_transaction_callback_t transaction_callback;

typedef struct {
  bool active;
  ng_watch_handle_t handle;
  ng_scope_handle_t scope_handle;
  ng_bytes_t path;
  void *context;
  ng_scope_observer_t callback;
} ng_observer_registration_t;

static ng_observer_registration_t observers[NG_WASM_OBSERVER_CAPACITY];
static ng_wasm_abi_error_t local_error;

static void ng_clear_local_error(void) {
  local_error = NG_WASM_ABI_ERROR_NONE;
}

static bool ng_fail(ng_wasm_abi_error_t error) {
  local_error = error;
  return false;
}

static bool ng_status(uint32_t value) {
  if (value != 0) {
    return true;
  }
  if (ng_import_error_code() == NG_WASM_ABI_ERROR_NONE) {
    local_error = NG_WASM_ABI_ERROR_OPERATION_FAILED;
  }
  return false;
}

static bool ng_bytes_equal(ng_bytes_t left, ng_bytes_t right) {
  if (left.len != right.len) {
    return false;
  }
  for (uint32_t index = 0; index < left.len; ++index) {
    if (left.ptr[index] != right.ptr[index]) {
      return false;
    }
  }
  return true;
}

static bool ng_bytes_equal_text(ng_bytes_t value, const char *text) {
  return ng_bytes_equal(value, ng_bytes_from_cstr(text));
}


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
  ng_scope_ref_t ref = {handle};
  return ref;
}

ng_scope_ref_t ng_scope_ref_from_name(ng_bytes_t name) {
  return ng_scope_resolve_name(name);
}

bool ng_scope_ref_valid(ng_scope_ref_t scope) {
  return scope.handle != 0;
}

static bool ng_path_segment_is_unsafe(ng_bytes_t path, uint32_t start,
                                      uint32_t end) {
  ng_bytes_t segment = ng_bytes_view(path.ptr + start, end - start);
  return ng_bytes_equal_text(segment, "__proto__") ||
         ng_bytes_equal_text(segment, "prototype") ||
         ng_bytes_equal_text(segment, "constructor");
}

static bool ng_path_is_safe(ng_bytes_t path) {
  uint32_t segment_start = 0;
  bool has_segment = false;

  for (uint32_t index = 0; index <= path.len; ++index) {
    if (index != path.len && path.ptr[index] != '.') {
      continue;
    }
    if (index != segment_start) {
      has_segment = true;
      if (ng_path_segment_is_unsafe(path, segment_start, index)) {
        return false;
      }
    }
    segment_start = index + 1;
  }
  return has_segment;
}

static bool ng_validate_scope_path(ng_scope_ref_t scope, ng_bytes_t path) {
  if (!ng_scope_ref_valid(scope)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }
  if (path.ptr == NULL && path.len != 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (path.len == 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_LENGTH);
  }
  if (!ng_path_is_safe(path)) {
    return ng_fail(NG_WASM_ABI_ERROR_UNSAFE_PATH);
  }
  return true;
}

ng_scope_ref_t ng_scope_resolve_name(ng_bytes_t name) {
  ng_clear_local_error();
  if (name.ptr == NULL && name.len != 0) {
    ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
    return ng_scope_ref_from_handle(0);
  }
  if (name.len == 0) {
    ng_fail(NG_WASM_ABI_ERROR_INVALID_LENGTH);
    return ng_scope_ref_from_handle(0);
  }

  return ng_scope_ref_from_handle(ng_import_scope_resolve(name.ptr, name.len));
}

ng_buffer_handle_t ng_scope_get_json(ng_scope_ref_t scope, ng_bytes_t path) {
  ng_clear_local_error();
  if (!ng_validate_scope_path(scope, path)) {
    return 0;
  }

  return ng_import_scope_get(scope.handle, path.ptr, path.len);
}

bool ng_scope_set_json(ng_scope_ref_t scope, ng_bytes_t path, ng_bytes_t json) {
  ng_clear_local_error();
  if (!ng_validate_scope_path(scope, path)) {
    return false;
  }
  if (json.ptr == NULL && json.len != 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (json.len == 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_JSON);
  }

  return ng_status(
      ng_import_scope_set(scope.handle, path.ptr, path.len, json.ptr, json.len));
}

bool ng_scope_apply_json(ng_scope_ref_t scope, ng_bytes_t transaction_json) {
  ng_clear_local_error();
  if (!ng_scope_ref_valid(scope)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }
  if (transaction_json.ptr == NULL && transaction_json.len != 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (transaction_json.len == 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_TRANSACTION);
  }

  return ng_status(ng_import_scope_apply(scope.handle, transaction_json.ptr,
                                         transaction_json.len));
}

ng_buffer_handle_t ng_scope_get_binary(ng_scope_ref_t scope, ng_bytes_t path) {
  ng_clear_local_error();
  if (!ng_validate_scope_path(scope, path)) {
    return 0;
  }

  return ng_import_scope_get_binary(scope.handle, path.ptr, path.len);
}

bool ng_scope_set_binary(ng_scope_ref_t scope, ng_bytes_t path,
                         ng_bytes_t value, ng_bytes_t options_json) {
  ng_clear_local_error();
  if (!ng_validate_scope_path(scope, path)) {
    return false;
  }
  if ((value.ptr == NULL && value.len != 0) ||
      (options_json.ptr == NULL && options_json.len != 0)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }

  return ng_status(ng_import_scope_set_binary(
      scope.handle, path.ptr, path.len, value.ptr, value.len, options_json.ptr,
      options_json.len));
}

bool ng_scope_delete_path(ng_scope_ref_t scope, ng_bytes_t path) {
  ng_clear_local_error();
  if (!ng_validate_scope_path(scope, path)) {
    return false;
  }

  return ng_status(ng_import_scope_delete(scope.handle, path.ptr, path.len));
}

bool ng_scope_sync_ref(ng_scope_ref_t scope) {
  ng_clear_local_error();
  if (!ng_scope_ref_valid(scope)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }

  return ng_status(ng_import_scope_sync(scope.handle));
}

ng_watch_handle_t ng_scope_watch_path(ng_scope_ref_t scope, ng_bytes_t path) {
  ng_clear_local_error();
  if (!ng_validate_scope_path(scope, path)) {
    return 0;
  }

  return ng_import_scope_watch(scope.handle, path.ptr, path.len);
}

bool ng_scope_unwatch_handle(ng_watch_handle_t watch_handle) {
  ng_clear_local_error();
  if (watch_handle == 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }

  return ng_status(ng_import_scope_unwatch(watch_handle));
}

bool ng_scope_unbind_ref(ng_scope_ref_t scope) {
  ng_clear_local_error();
  if (!ng_scope_ref_valid(scope)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }

  return ng_status(ng_import_scope_unbind(scope.handle));
}

static bool ng_result_from_handle(ng_buffer_handle_t handle,
                                  ng_result_t *result) {
  if (result == NULL) {
    if (handle != 0) {
      ng_buffer_release(handle);
    }
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }

  result->handle = 0;
  result->bytes = ng_bytes_view(NULL, 0);
  if (handle == 0) {
    return false;
  }

  const uint8_t *data = ng_buffer_data(handle);
  uint32_t size = ng_buffer_size(handle);
  if (data == NULL && size != 0) {
    ng_buffer_release(handle);
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }

  result->handle = handle;
  result->bytes = ng_bytes_view(data, size);
  return true;
}

bool ng_scope_read_json(ng_scope_ref_t scope, ng_field_t field,
                        ng_result_t *result) {
  return ng_result_from_handle(ng_scope_get_json(scope, field.path), result);
}

bool ng_scope_read_binary(ng_scope_ref_t scope, ng_field_t field,
                          ng_result_t *result) {
  return ng_result_from_handle(ng_scope_get_binary(scope, field.path), result);
}

void ng_result_release(ng_result_t *result) {
  if (result == NULL) {
    return;
  }
  ng_buffer_release(result->handle);
  result->handle = 0;
  result->bytes = ng_bytes_view(NULL, 0);
}

enum { NG_UPDATE_PHASE_SET = 1, NG_UPDATE_PHASE_DELETE = 2 };

static bool ng_update_append(ng_update_t *update, const void *value,
                             uint32_t len) {
  if (!update->valid || (value == NULL && len != 0) ||
      len > update->capacity - update->length) {
    update->valid = false;
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_LENGTH);
  }

  const uint8_t *bytes = (const uint8_t *)value;
  for (uint32_t index = 0; index < len; ++index) {
    update->buffer[update->length++] = bytes[index];
  }
  return true;
}

static bool ng_update_append_text(ng_update_t *update, const char *value) {
  return ng_update_append(update, value, ng_bytes_from_cstr(value).len);
}

static bool ng_update_append_hex_escape(ng_update_t *update, uint8_t value) {
  static const char digits[] = "0123456789abcdef";
  char escaped[] = {'\\', 'u', '0', '0', digits[value >> 4],
                    digits[value & 15u]};
  return ng_update_append(update, escaped, sizeof(escaped));
}

static bool ng_update_append_quoted(ng_update_t *update, ng_bytes_t value) {
  if (value.ptr == NULL && value.len != 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (!ng_update_append_text(update, "\"")) {
    return false;
  }
  for (uint32_t index = 0; index < value.len; ++index) {
    uint8_t byte = value.ptr[index];
    if (byte == '"' || byte == '\\') {
      char escaped[] = {'\\', (char)byte};
      if (!ng_update_append(update, escaped, sizeof(escaped))) {
        return false;
      }
    } else if (byte == '\b' || byte == '\f' || byte == '\n' ||
               byte == '\r' || byte == '\t') {
      char code = byte == '\b'   ? 'b'
                  : byte == '\f' ? 'f'
                  : byte == '\n' ? 'n'
                  : byte == '\r' ? 'r'
                                  : 't';
      char escaped[] = {'\\', code};
      if (!ng_update_append(update, escaped, sizeof(escaped))) {
        return false;
      }
    } else if (byte < 0x20u) {
      if (!ng_update_append_hex_escape(update, byte)) {
        return false;
      }
    } else if (!ng_update_append(update, &byte, 1)) {
      return false;
    }
  }
  return ng_update_append_text(update, "\"");
}

bool ng_update_begin(ng_update_t *update, ng_scope_ref_t scope, void *buffer,
                     uint32_t capacity) {
  ng_clear_local_error();
  if (update == NULL || buffer == NULL) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (!ng_scope_ref_valid(scope)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }

  ng_update_t next = {
      scope, (uint8_t *)buffer, capacity, 0, 0, 0, NG_UPDATE_PHASE_SET, true,
  };
  *update = next;
  return ng_update_append_text(update, "{\"set\":{");
}

bool ng_update_set_json(ng_update_t *update, ng_field_t field,
                        ng_bytes_t value_json) {
  ng_clear_local_error();
  if (update == NULL) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (!update->valid || update->phase != NG_UPDATE_PHASE_SET) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_TRANSACTION);
  }
  if (!ng_validate_scope_path(update->scope, field.path)) {
    return false;
  }
  if (value_json.ptr == NULL && value_json.len != 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (value_json.len == 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_JSON);
  }
  if (update->set_count != 0 && !ng_update_append_text(update, ",")) {
    return false;
  }
  if (!ng_update_append_quoted(update, field.path) ||
      !ng_update_append_text(update, ":") ||
      !ng_update_append(update, value_json.ptr, value_json.len)) {
    return false;
  }
  ++update->set_count;
  return true;
}

bool ng_update_delete(ng_update_t *update, ng_field_t field) {
  ng_clear_local_error();
  if (update == NULL) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (!update->valid || (update->phase != NG_UPDATE_PHASE_SET &&
                         update->phase != NG_UPDATE_PHASE_DELETE)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_TRANSACTION);
  }
  if (!ng_validate_scope_path(update->scope, field.path)) {
    return false;
  }
  if (update->phase == NG_UPDATE_PHASE_SET) {
    if (!ng_update_append_text(update, "},\"delete\":[")) {
      return false;
    }
    update->phase = NG_UPDATE_PHASE_DELETE;
  } else if (!ng_update_append_text(update, ",")) {
    return false;
  }
  if (!ng_update_append_quoted(update, field.path)) {
    return false;
  }
  ++update->delete_count;
  return true;
}

bool ng_update_commit(ng_update_t *update, ng_write_options_t options) {
  ng_clear_local_error();
  if (update == NULL) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (!update->valid || (update->set_count == 0 && update->delete_count == 0)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_TRANSACTION);
  }
  if (options.origin.ptr == NULL && options.origin.len != 0) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (options.echo < NG_ECHO_DEFAULT || options.echo > NG_ECHO_TRUE) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_TRANSACTION);
  }

  if (!ng_update_append_text(
          update, update->phase == NG_UPDATE_PHASE_SET ? "}" : "]")) {
    return false;
  }
  if (options.origin.len != 0 &&
      (!ng_update_append_text(update, ",\"origin\":") ||
       !ng_update_append_quoted(update, options.origin))) {
    return false;
  }
  if (options.echo != NG_ECHO_DEFAULT &&
      (!ng_update_append_text(update, ",\"echo\":") ||
       !ng_update_append_text(update,
                              options.echo == NG_ECHO_TRUE ? "true" : "false"))) {
    return false;
  }
  if (!ng_update_append_text(update, "}")) {
    return false;
  }

  ng_bytes_t transaction = ng_bytes_view(update->buffer, update->length);
  update->valid = false;
  return ng_scope_apply_json(update->scope, transaction);
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

ng_wasm_abi_error_t ng_abi_error(void) {
  if (local_error != NG_WASM_ABI_ERROR_NONE) {
    return local_error;
  }
  return (ng_wasm_abi_error_t)ng_import_error_code();
}

void ng_abi_error_clear(void) {
  ng_clear_local_error();
  ng_import_error_clear();
}

bool ng_scope_observe(ng_scope_ref_t scope, ng_field_t field,
                      ng_watch_options_t options, void *context,
                      ng_scope_observer_t callback, ng_watch_t *watch) {
  ng_clear_local_error();
  if (callback == NULL || watch == NULL) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (ng_watch_active(watch)) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_TRANSACTION);
  }
  watch->handle = 0;
  watch->slot = 0;
  if (!ng_validate_scope_path(scope, field.path)) {
    return false;
  }

  uint32_t slot = NG_WASM_OBSERVER_CAPACITY;
  for (uint32_t index = 0; index < NG_WASM_OBSERVER_CAPACITY; ++index) {
    if (!observers[index].active) {
      slot = index;
      break;
    }
  }
  if (slot == NG_WASM_OBSERVER_CAPACITY) {
    return ng_fail(NG_WASM_ABI_ERROR_LIMIT_EXCEEDED);
  }

  ng_watch_handle_t handle = ng_scope_watch_path(scope, field.path);
  if (handle == 0) {
    return false;
  }

  ng_observer_registration_t registration = {
      true, handle, scope.handle, field.path, context, callback,
  };
  observers[slot] = registration;
  watch->handle = handle;
  watch->slot = slot + 1;

  if (options.initial) {
    ng_result_t result;
    if (ng_scope_read_json(scope, field, &result)) {
      ng_scope_update_t update = {
          scope.handle, field.path, result.bytes, ng_bytes_view(NULL, 0), false,
      };
      callback(context, &update);
      ng_result_release(&result);
    }
  }
  return true;
}

bool ng_watch_cancel(ng_watch_t *watch) {
  ng_clear_local_error();
  if (watch == NULL) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_POINTER);
  }
  if (watch->slot == 0 || watch->slot > NG_WASM_OBSERVER_CAPACITY) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }

  ng_observer_registration_t *registration = &observers[watch->slot - 1];
  if (!registration->active || registration->handle != watch->handle) {
    return ng_fail(NG_WASM_ABI_ERROR_INVALID_HANDLE);
  }
  if (!ng_scope_unwatch_handle(watch->handle)) {
    return false;
  }

  registration->active = false;
  watch->handle = 0;
  watch->slot = 0;
  return true;
}

bool ng_watch_active(const ng_watch_t *watch) {
  if (watch == NULL || watch->slot == 0 ||
      watch->slot > NG_WASM_OBSERVER_CAPACITY) {
    return false;
  }
  const ng_observer_registration_t *registration =
      &observers[watch->slot - 1];
  return registration->active && registration->handle == watch->handle;
}

static void ng_json_skip_whitespace(ng_bytes_t json, uint32_t *index) {
  while (*index < json.len) {
    uint8_t byte = json.ptr[*index];
    if (byte != ' ' && byte != '\n' && byte != '\r' && byte != '\t') {
      return;
    }
    ++*index;
  }
}

static bool ng_json_scan_string(ng_bytes_t json, uint32_t *index,
                                ng_bytes_t *content) {
  if (*index >= json.len || json.ptr[*index] != '"') {
    return false;
  }
  uint32_t start = ++*index;
  while (*index < json.len) {
    uint8_t byte = json.ptr[*index];
    if (byte == '\\') {
      *index += 2;
      if (*index > json.len) {
        return false;
      }
      continue;
    }
    if (byte == '"') {
      if (content != NULL) {
        *content = ng_bytes_view(json.ptr + start, *index - start);
      }
      ++*index;
      return true;
    }
    ++*index;
  }
  return false;
}

static bool ng_json_scan_value(ng_bytes_t json, uint32_t *index,
                               ng_bytes_t *value) {
  ng_json_skip_whitespace(json, index);
  uint32_t start = *index;
  if (start >= json.len) {
    return false;
  }
  if (json.ptr[start] == '"') {
    if (!ng_json_scan_string(json, index, NULL)) {
      return false;
    }
  } else if (json.ptr[start] == '{' || json.ptr[start] == '[') {
    uint32_t depth = 0;
    while (*index < json.len) {
      uint8_t byte = json.ptr[*index];
      if (byte == '"') {
        if (!ng_json_scan_string(json, index, NULL)) {
          return false;
        }
        continue;
      }
      if (byte == '{' || byte == '[') {
        ++depth;
      } else if (byte == '}' || byte == ']') {
        if (depth == 0) {
          return false;
        }
        --depth;
        if (depth == 0) {
          ++*index;
          break;
        }
      }
      ++*index;
    }
    if (depth != 0) {
      return false;
    }
  } else {
    while (*index < json.len && json.ptr[*index] != ',' &&
           json.ptr[*index] != '}' && json.ptr[*index] != ']') {
      ++*index;
    }
  }

  uint32_t end = *index;
  while (end > start && (json.ptr[end - 1] == ' ' ||
                         json.ptr[end - 1] == '\n' ||
                         json.ptr[end - 1] == '\r' ||
                         json.ptr[end - 1] == '\t')) {
    --end;
  }
  if (end == start) {
    return false;
  }
  *value = ng_bytes_view(json.ptr + start, end - start);
  return true;
}

static bool ng_json_find_member(ng_bytes_t json, const char *name,
                                ng_bytes_t *value) {
  uint32_t index = 0;
  ng_json_skip_whitespace(json, &index);
  if (index >= json.len || json.ptr[index++] != '{') {
    return false;
  }
  while (index < json.len) {
    ng_json_skip_whitespace(json, &index);
    if (index < json.len && json.ptr[index] == '}') {
      return false;
    }
    ng_bytes_t key;
    ng_bytes_t member;
    if (!ng_json_scan_string(json, &index, &key)) {
      return false;
    }
    ng_json_skip_whitespace(json, &index);
    if (index >= json.len || json.ptr[index++] != ':' ||
        !ng_json_scan_value(json, &index, &member)) {
      return false;
    }
    if (ng_bytes_equal_text(key, name)) {
      *value = member;
      return true;
    }
    ng_json_skip_whitespace(json, &index);
    if (index >= json.len || json.ptr[index] != ',') {
      return false;
    }
    ++index;
  }
  return false;
}

static void ng_dispatch_update(ng_scope_handle_t scope_handle, ng_bytes_t path,
                               ng_bytes_t value_json, ng_bytes_t origin_json,
                               bool deleted) {
  ng_scope_update_t update = {
      scope_handle, path, value_json, origin_json, deleted,
  };
  for (uint32_t index = 0; index < NG_WASM_OBSERVER_CAPACITY; ++index) {
    ng_observer_registration_t *registration = &observers[index];
    if (registration->active && registration->scope_handle == scope_handle &&
        ng_bytes_equal(registration->path, path)) {
      registration->callback(registration->context, &update);
    }
  }
}

static bool ng_dispatch_set(ng_scope_handle_t scope_handle, ng_bytes_t set,
                            ng_bytes_t origin) {
  uint32_t index = 0;
  ng_json_skip_whitespace(set, &index);
  if (index >= set.len || set.ptr[index++] != '{') {
    return false;
  }
  while (index < set.len) {
    ng_json_skip_whitespace(set, &index);
    if (index < set.len && set.ptr[index] == '}') {
      return true;
    }
    ng_bytes_t path;
    ng_bytes_t value;
    if (!ng_json_scan_string(set, &index, &path)) {
      return false;
    }
    ng_json_skip_whitespace(set, &index);
    if (index >= set.len || set.ptr[index++] != ':' ||
        !ng_json_scan_value(set, &index, &value)) {
      return false;
    }
    ng_dispatch_update(scope_handle, path, value, origin, false);
    ng_json_skip_whitespace(set, &index);
    if (index < set.len && set.ptr[index] == ',') {
      ++index;
    } else if (index >= set.len || set.ptr[index] != '}') {
      return false;
    }
  }
  return false;
}

static bool ng_dispatch_delete(ng_scope_handle_t scope_handle,
                               ng_bytes_t deleted, ng_bytes_t origin) {
  uint32_t index = 0;
  ng_json_skip_whitespace(deleted, &index);
  if (index >= deleted.len || deleted.ptr[index++] != '[') {
    return false;
  }
  while (index < deleted.len) {
    ng_json_skip_whitespace(deleted, &index);
    if (index < deleted.len && deleted.ptr[index] == ']') {
      return true;
    }
    ng_bytes_t path;
    if (!ng_json_scan_string(deleted, &index, &path)) {
      return false;
    }
    ng_dispatch_update(scope_handle, path, ng_bytes_view(NULL, 0), origin,
                       true);
    ng_json_skip_whitespace(deleted, &index);
    if (index < deleted.len && deleted.ptr[index] == ',') {
      ++index;
    } else if (index >= deleted.len || deleted.ptr[index] != ']') {
      return false;
    }
  }
  return false;
}

static bool ng_dispatch_transaction(ng_scope_handle_t scope_handle,
                                    ng_bytes_t transaction) {
  ng_bytes_t origin = ng_bytes_view(NULL, 0);
  ng_bytes_t set;
  ng_bytes_t deleted;
  bool has_origin = ng_json_find_member(transaction, "origin", &origin);
  bool has_set = ng_json_find_member(transaction, "set", &set);
  bool has_delete = ng_json_find_member(transaction, "delete", &deleted);
  (void)has_origin;

  if (!has_set && !has_delete) {
    return false;
  }
  if (has_set && !ng_dispatch_set(scope_handle, set, origin)) {
    return false;
  }
  if (has_delete && !ng_dispatch_delete(scope_handle, deleted, origin)) {
    return false;
  }
  return true;
}

void ng_set_scope_bind_callback(ng_scope_bind_callback_t callback) {
  bind_callback = callback;
}

void ng_set_scope_unbind_callback(ng_scope_unbind_callback_t callback) {
  unbind_callback = callback;
}

void ng_set_scope_transaction_callback(
    ng_scope_transaction_callback_t callback) {
  transaction_callback = callback;
}

NG_WASM_EXPORT(ng_abi_version)
uint32_t ng_abi_version(void) { return NG_WASM_ABI_VERSION; }

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
  for (uint32_t index = 0; index < NG_WASM_OBSERVER_CAPACITY; ++index) {
    if (observers[index].active &&
        observers[index].scope_handle == scope_handle) {
      observers[index].active = false;
    }
  }
  if (unbind_callback != NULL) {
    unbind_callback(scope_handle);
  }
}

NG_WASM_EXPORT(ng_scope_on_transaction)
void ng_scope_on_transaction(ng_scope_handle_t scope_handle,
                             const uint8_t *transaction_ptr,
                             uint32_t transaction_len) {
  ng_bytes_t transaction_json =
      ng_bytes_view(transaction_ptr, transaction_len);
  if (!ng_dispatch_transaction(scope_handle, transaction_json)) {
    local_error = NG_WASM_ABI_ERROR_INVALID_TRANSACTION;
  }
  if (transaction_callback != NULL) {
    ng_scope_transaction_t transaction = {
        scope_handle,
        transaction_json,
    };
    transaction_callback(transaction);
  }
}

#undef NG_WASM_IMPORT
#undef NG_WASM_EXPORT
