#include "angular_ts_wasm.h"

#include <assert.h>
#include <string.h>

static ng_scope_handle_t last_bind_handle;
static ng_bytes_t last_bind_name;
static ng_scope_handle_t last_unbind_handle;
static ng_scope_update_t last_update;

static void remember_bind(ng_scope_handle_t scope_handle, ng_bytes_t name) {
  last_bind_handle = scope_handle;
  last_bind_name = name;
}

static void remember_unbind(ng_scope_handle_t scope_handle) {
  last_unbind_handle = scope_handle;
}

static void remember_update(ng_scope_update_t update) { last_update = update; }

static bool bytes_equal(ng_bytes_t bytes, const char *value) {
  size_t value_len = strlen(value);
  return bytes.len == value_len && memcmp(bytes.ptr, value, value_len) == 0;
}

int main(void) {
  ng_bytes_t bytes = ng_bytes_from_cstr("todo");
  assert(bytes.len == 4);
  assert(bytes_equal(bytes, "todo"));

  ng_scope_ref_t invalid = ng_scope_ref_from_handle(0);
  assert(!ng_scope_ref_valid(invalid));
  assert(ng_scope_get_json(invalid, ng_bytes_from_cstr("title")) == 0);
  assert(!ng_scope_set_json(invalid, ng_bytes_from_cstr("title"),
                            ng_bytes_from_cstr("\"Todo\"")));
  assert(!ng_scope_delete_path(invalid, ng_bytes_from_cstr("title")));
  assert(!ng_scope_sync_ref(invalid));
  assert(ng_scope_watch_path(invalid, ng_bytes_from_cstr("title")) == 0);
  assert(!ng_scope_unwatch_handle(0));
  assert(!ng_scope_unbind_ref(invalid));

  ng_scope_ref_t named =
      ng_scope_ref_from_name(ng_bytes_from_cstr("todoList:main"));
  assert(ng_scope_ref_valid(named));
  assert(ng_scope_ref_named(named));
  assert(bytes_equal(named.name, "todoList:main"));

  ng_scope_ref_t resolved = ng_scope_resolve_name(ng_bytes_from_cstr("missing"));
  assert(!ng_scope_ref_valid(resolved));

  uint8_t *allocation = ng_abi_alloc(8);
  assert(allocation != NULL);
  memcpy(allocation, "Angular", 8);
  ng_abi_free(allocation, 8);

  ng_test_reset_host();
  ng_test_set_buffer(77, ng_bytes_from_cstr("{\"title\":\"Todo\"}"));
  assert(ng_buffer_data(77) != NULL);
  assert(ng_buffer_size(77) == 16);
  ng_buffer_release(77);
  assert(ng_test_buffer_free_count() == 1);
  assert(ng_test_freed_buffer() == 77);

  ng_set_scope_bind_callback(remember_bind);
  ng_set_scope_unbind_callback(remember_unbind);
  ng_set_scope_update_callback(remember_update);

  ng_scope_on_bind(12, (const uint8_t *)"todoList:main", 13);
  assert(last_bind_handle == 12);
  assert(bytes_equal(last_bind_name, "todoList:main"));

  ng_scope_on_unbind(12);
  assert(last_unbind_handle == 12);

  ng_scope_on_update(12, (const uint8_t *)"newTodo", 7,
                     (const uint8_t *)"\"Review C\"", 10);
  assert(last_update.scope_handle == 12);
  assert(bytes_equal(last_update.path, "newTodo"));
  assert(bytes_equal(last_update.value_json, "\"Review C\""));

  ng_set_scope_bind_callback(NULL);
  ng_set_scope_unbind_callback(NULL);
  ng_set_scope_update_callback(NULL);

  return 0;
}
