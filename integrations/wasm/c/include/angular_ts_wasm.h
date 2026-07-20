#ifndef ANGULAR_TS_WASM_H_
#define ANGULAR_TS_WASM_H_

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#if defined(__cplusplus)
extern "C" {
#endif

typedef uint32_t ng_scope_handle_t;
typedef uint32_t ng_watch_handle_t;
typedef uint32_t ng_buffer_handle_t;

#define NG_WASM_ABI_VERSION 3u

#ifndef NG_WASM_OBSERVER_CAPACITY
#define NG_WASM_OBSERVER_CAPACITY 32u
#endif

typedef enum {
  NG_WASM_ABI_ERROR_NONE = 0,
  NG_WASM_ABI_ERROR_DISPOSED = 1,
  NG_WASM_ABI_ERROR_INVALID_HANDLE = 2,
  NG_WASM_ABI_ERROR_INVALID_POINTER = 3,
  NG_WASM_ABI_ERROR_INVALID_LENGTH = 4,
  NG_WASM_ABI_ERROR_INVALID_JSON = 5,
  NG_WASM_ABI_ERROR_UNSAFE_PATH = 6,
  NG_WASM_ABI_ERROR_LIMIT_EXCEEDED = 7,
  NG_WASM_ABI_ERROR_INVALID_TRANSACTION = 8,
  NG_WASM_ABI_ERROR_UNSUPPORTED_VALUE = 9,
  NG_WASM_ABI_ERROR_OPERATION_FAILED = 10
} ng_wasm_abi_error_t;

typedef struct {
  const uint8_t *ptr;
  uint32_t len;
} ng_bytes_t;

typedef struct {
  ng_bytes_t path;
  bool optional;
} ng_field_t;

#define NG_DECLARE_FIELD_TYPE(name) \
  typedef struct {                  \
    ng_field_t base;                \
  } ng_##name##_field_t

NG_DECLARE_FIELD_TYPE(bool);
NG_DECLARE_FIELD_TYPE(i32);
NG_DECLARE_FIELD_TYPE(u32);
NG_DECLARE_FIELD_TYPE(i64);
NG_DECLARE_FIELD_TYPE(u64);
NG_DECLARE_FIELD_TYPE(f32);
NG_DECLARE_FIELD_TYPE(f64);
NG_DECLARE_FIELD_TYPE(string);
NG_DECLARE_FIELD_TYPE(json);
NG_DECLARE_FIELD_TYPE(binary);

#undef NG_DECLARE_FIELD_TYPE

#define NG_FIELD_BASE(path_value, optional_value)                         \
  {                                                                      \
    {(const uint8_t *)(path_value), (uint32_t)(sizeof(path_value) - 1u)}, \
        (optional_value)                                                  \
  }
#define NG_BOOL_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_I32_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_U32_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_I64_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_U64_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_F32_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_F64_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_STRING_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_JSON_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_BINARY_FIELD(path) {NG_FIELD_BASE(path, false)}
#define NG_OPTIONAL_BOOL_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_I32_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_U32_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_I64_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_U64_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_F32_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_F64_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_STRING_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_JSON_FIELD(path) {NG_FIELD_BASE(path, true)}
#define NG_OPTIONAL_BINARY_FIELD(path) {NG_FIELD_BASE(path, true)}

typedef struct {
  ng_scope_handle_t handle;
} ng_scope_ref_t;

typedef struct {
  ng_scope_handle_t scope_handle;
  ng_bytes_t transaction_json;
} ng_scope_transaction_t;

typedef struct {
  ng_buffer_handle_t handle;
  ng_bytes_t bytes;
} ng_result_t;

typedef struct {
  ng_scope_handle_t scope_handle;
  ng_bytes_t path;
  ng_bytes_t value_json;
  ng_bytes_t origin_json;
  bool deleted;
} ng_scope_update_t;

typedef enum {
  NG_ECHO_DEFAULT = -1,
  NG_ECHO_FALSE = 0,
  NG_ECHO_TRUE = 1
} ng_echo_t;

typedef struct {
  ng_bytes_t origin;
  ng_echo_t echo;
} ng_write_options_t;

#define NG_WRITE_OPTIONS_DEFAULT \
  ((ng_write_options_t){{NULL, 0}, NG_ECHO_DEFAULT})

typedef struct {
  ng_scope_ref_t scope;
  uint8_t *buffer;
  uint32_t capacity;
  uint32_t length;
  uint32_t set_count;
  uint32_t delete_count;
  uint8_t phase;
  bool valid;
} ng_update_t;

typedef struct {
  ng_watch_handle_t handle;
  uint32_t slot;
} ng_watch_t;

typedef struct {
  bool initial;
} ng_watch_options_t;

#define NG_WATCH_OPTIONS_DEFAULT ((ng_watch_options_t){false})

typedef void (*ng_scope_bind_callback_t)(ng_scope_handle_t scope_handle,
                                         ng_bytes_t name);
typedef void (*ng_scope_unbind_callback_t)(ng_scope_handle_t scope_handle);
typedef void (*ng_scope_transaction_callback_t)(
    ng_scope_transaction_t transaction);
typedef void (*ng_scope_observer_t)(void *context,
                                    const ng_scope_update_t *update);

ng_bytes_t ng_bytes_view(const void *ptr, uint32_t len);
ng_bytes_t ng_bytes_from_cstr(const char *value);

ng_scope_ref_t ng_scope_ref_from_handle(ng_scope_handle_t handle);
ng_scope_ref_t ng_scope_ref_from_name(ng_bytes_t name);
bool ng_scope_ref_valid(ng_scope_ref_t scope);

ng_scope_ref_t ng_scope_resolve_name(ng_bytes_t name);
bool ng_scope_read_json(ng_scope_ref_t scope, ng_field_t field,
                        ng_result_t *result);
bool ng_scope_read_binary(ng_scope_ref_t scope, ng_field_t field,
                          ng_result_t *result);
void ng_result_release(ng_result_t *result);
ng_buffer_handle_t ng_scope_get_json(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_set_json(ng_scope_ref_t scope, ng_bytes_t path, ng_bytes_t json);
bool ng_scope_apply_json(ng_scope_ref_t scope, ng_bytes_t transaction_json);
ng_buffer_handle_t ng_scope_get_binary(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_set_binary(ng_scope_ref_t scope, ng_bytes_t path,
                         ng_bytes_t value, ng_bytes_t options_json);
bool ng_scope_delete_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_sync_ref(ng_scope_ref_t scope);
ng_watch_handle_t ng_scope_watch_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_unwatch_handle(ng_watch_handle_t watch_handle);
bool ng_scope_unbind_ref(ng_scope_ref_t scope);

bool ng_update_begin(ng_update_t *update, ng_scope_ref_t scope, void *buffer,
                     uint32_t capacity);
bool ng_update_set_json(ng_update_t *update, ng_field_t field,
                        ng_bytes_t value_json);
bool ng_update_delete(ng_update_t *update, ng_field_t field);
bool ng_update_commit(ng_update_t *update, ng_write_options_t options);

bool ng_scope_observe(ng_scope_ref_t scope, ng_field_t field,
                      ng_watch_options_t options, void *context,
                      ng_scope_observer_t callback, ng_watch_t *watch);
bool ng_watch_cancel(ng_watch_t *watch);
bool ng_watch_active(const ng_watch_t *watch);

const uint8_t *ng_buffer_data(ng_buffer_handle_t buffer_handle);
uint32_t ng_buffer_size(ng_buffer_handle_t buffer_handle);
void ng_buffer_release(ng_buffer_handle_t buffer_handle);
ng_wasm_abi_error_t ng_abi_error(void);
void ng_abi_error_clear(void);

void ng_set_scope_bind_callback(ng_scope_bind_callback_t callback);
void ng_set_scope_unbind_callback(ng_scope_unbind_callback_t callback);
void ng_set_scope_transaction_callback(
    ng_scope_transaction_callback_t callback);

uint32_t ng_abi_version(void);
uint8_t *ng_abi_alloc(uint32_t size);
void ng_abi_free(uint8_t *ptr, uint32_t size);
void ng_scope_on_bind(ng_scope_handle_t scope_handle, const uint8_t *name_ptr,
                      uint32_t name_len);
void ng_scope_on_unbind(ng_scope_handle_t scope_handle);
void ng_scope_on_transaction(ng_scope_handle_t scope_handle,
                             const uint8_t *transaction_ptr,
                             uint32_t transaction_len);

#if !defined(__wasm__)
void ng_test_reset_host(void);
void ng_test_set_buffer(ng_buffer_handle_t buffer_handle, ng_bytes_t value);
uint32_t ng_test_buffer_free_count(void);
ng_buffer_handle_t ng_test_freed_buffer(void);
ng_bytes_t ng_test_last_transaction(void);
#endif

#if defined(__cplusplus)
}
#endif

#endif /* ANGULAR_TS_WASM_H_ */
