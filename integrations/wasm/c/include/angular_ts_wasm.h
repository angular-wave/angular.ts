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

typedef struct {
  const uint8_t *ptr;
  uint32_t len;
} ng_bytes_t;

typedef struct {
  ng_scope_handle_t handle;
  ng_bytes_t name;
} ng_scope_ref_t;

typedef struct {
  ng_scope_handle_t scope_handle;
  ng_bytes_t path;
  ng_bytes_t value_json;
} ng_scope_update_t;

typedef void (*ng_scope_bind_callback_t)(ng_scope_handle_t scope_handle,
                                         ng_bytes_t name);
typedef void (*ng_scope_unbind_callback_t)(ng_scope_handle_t scope_handle);
typedef void (*ng_scope_update_callback_t)(ng_scope_update_t update);

ng_bytes_t ng_bytes_view(const void *ptr, uint32_t len);
ng_bytes_t ng_bytes_from_cstr(const char *value);

ng_scope_ref_t ng_scope_ref_from_handle(ng_scope_handle_t handle);
ng_scope_ref_t ng_scope_ref_from_name(ng_bytes_t name);
bool ng_scope_ref_valid(ng_scope_ref_t scope);
bool ng_scope_ref_named(ng_scope_ref_t scope);

ng_scope_ref_t ng_scope_resolve_name(ng_bytes_t name);
ng_buffer_handle_t ng_scope_get_json(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_set_json(ng_scope_ref_t scope, ng_bytes_t path, ng_bytes_t json);
bool ng_scope_delete_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_sync_ref(ng_scope_ref_t scope);
ng_watch_handle_t ng_scope_watch_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_unwatch_handle(ng_watch_handle_t watch_handle);
bool ng_scope_unbind_ref(ng_scope_ref_t scope);

const uint8_t *ng_buffer_data(ng_buffer_handle_t buffer_handle);
uint32_t ng_buffer_size(ng_buffer_handle_t buffer_handle);
void ng_buffer_release(ng_buffer_handle_t buffer_handle);

void ng_set_scope_bind_callback(ng_scope_bind_callback_t callback);
void ng_set_scope_unbind_callback(ng_scope_unbind_callback_t callback);
void ng_set_scope_update_callback(ng_scope_update_callback_t callback);

uint8_t *ng_abi_alloc(uint32_t size);
void ng_abi_free(uint8_t *ptr, uint32_t size);
void ng_scope_on_bind(ng_scope_handle_t scope_handle, const uint8_t *name_ptr,
                      uint32_t name_len);
void ng_scope_on_unbind(ng_scope_handle_t scope_handle);
void ng_scope_on_update(ng_scope_handle_t scope_handle,
                        const uint8_t *path_ptr, uint32_t path_len,
                        const uint8_t *value_ptr, uint32_t value_len);

#if !defined(__wasm__)
void ng_test_reset_host(void);
void ng_test_set_buffer(ng_buffer_handle_t buffer_handle, ng_bytes_t value);
uint32_t ng_test_buffer_free_count(void);
ng_buffer_handle_t ng_test_freed_buffer(void);
#endif

#if defined(__cplusplus)
}
#endif

#endif /* ANGULAR_TS_WASM_H_ */
