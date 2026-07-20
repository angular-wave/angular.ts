#include "angular_ts_wasm.h"
#include "player_contract.h"

#include <assert.h>
#include <string.h>

static ng_scope_handle_t last_bind_handle;
static ng_bytes_t last_bind_name;
static ng_scope_handle_t last_unbind_handle;
static ng_scope_transaction_t last_transaction;

typedef struct {
  uint32_t count;
  ng_scope_update_t update;
} observer_state_t;

static void remember_bind(ng_scope_handle_t scope_handle, ng_bytes_t name) {
  last_bind_handle = scope_handle;
  last_bind_name = name;
}

static void remember_unbind(ng_scope_handle_t scope_handle) {
  last_unbind_handle = scope_handle;
}

static void remember_transaction(ng_scope_transaction_t transaction) {
  last_transaction = transaction;
}

static void remember_update(void *context, const ng_scope_update_t *update) {
  observer_state_t *state = (observer_state_t *)context;
  ++state->count;
  state->update = *update;
}

static bool bytes_equal(ng_bytes_t bytes, const char *value) {
  size_t value_len = strlen(value);
  return bytes.len == value_len && memcmp(bytes.ptr, value, value_len) == 0;
}

static void test_basics(void) {
  assert(ng_abi_version() == NG_WASM_ABI_VERSION);

  ng_bytes_t bytes = ng_bytes_from_cstr("todo");
  assert(bytes.len == 4);
  assert(bytes_equal(bytes, "todo"));
  assert(ng_bytes_from_cstr(NULL).len == 0);

  ng_scope_ref_t invalid = ng_scope_ref_from_handle(0);
  assert(!ng_scope_ref_valid(invalid));
  assert(ng_scope_get_json(invalid, ng_bytes_from_cstr("title")) == 0);
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_INVALID_HANDLE);
  ng_abi_error_clear();
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_NONE);
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
  assert(named.handle == 12);

  ng_scope_ref_t unresolved = ng_scope_resolve_name(ng_bytes_from_cstr(""));
  assert(!ng_scope_ref_valid(unresolved));
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_INVALID_LENGTH);

  uint8_t *allocation = ng_abi_alloc(8);
  assert(allocation != NULL);
  memcpy(allocation, "Angular", 8);
  ng_abi_free(allocation, 8);
}

static void test_owned_results(ng_scope_ref_t scope) {
  ng_test_reset_host();
  ng_test_set_buffer(77, ng_bytes_from_cstr("{\"title\":\"Todo\"}"));

  ng_result_t result;
  ng_json_field_t title = NG_JSON_FIELD("title");
  assert(ng_scope_read_json(scope, title.base, &result));
  assert(result.handle == 77);
  assert(bytes_equal(result.bytes, "{\"title\":\"Todo\"}"));
  ng_result_release(&result);
  assert(result.handle == 0);
  assert(result.bytes.len == 0);
  assert(ng_test_buffer_free_count() == 1);
  assert(ng_test_freed_buffer() == 77);

  ng_test_set_buffer(78, ng_bytes_view("\x01\x02\x03", 3));
  assert(ng_scope_read_binary(scope, PLAYER_FRAME.base, &result));
  assert(result.bytes.len == 3);
  ng_result_release(&result);

  ng_test_set_buffer(79, ng_bytes_from_cstr("42"));
  assert(!ng_scope_read_json(scope, PLAYER_HEALTH.base, NULL));
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_INVALID_POINTER);
  assert(ng_test_freed_buffer() == 79);
}

static void test_atomic_updates(ng_scope_ref_t scope) {
  uint8_t transaction[256];
  ng_update_t update;

  assert(ng_update_begin(&update, scope, transaction, sizeof(transaction)));
  assert(ng_update_set_json(&update, PLAYER_HEALTH.base,
                            ng_bytes_from_cstr("42")));
  assert(ng_update_delete(&update, PLAYER_FRAME.base));
  ng_write_options_t options = {
      ng_bytes_from_cstr("c:test"),
      NG_ECHO_TRUE,
  };
  assert(ng_update_commit(&update, options));
  assert(bytes_equal(
      ng_test_last_transaction(),
      "{\"set\":{\"health\":42},\"delete\":[\"frame\"],\"origin\":\"c:test\",\"echo\":true}"));
  assert(!ng_update_commit(&update, options));
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_INVALID_TRANSACTION);

  assert(ng_update_begin(&update, scope, transaction, sizeof(transaction)));
  assert(ng_update_set_json(&update, PLAYER_NAME.base,
                            ng_bytes_from_cstr("\"Ada\"")));
  assert(ng_update_commit(&update, NG_WRITE_OPTIONS_DEFAULT));
  assert(bytes_equal(ng_test_last_transaction(),
                     "{\"set\":{\"name\":\"Ada\"}}"));

  uint8_t small[4];
  assert(!ng_update_begin(&update, scope, small, sizeof(small)));
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_INVALID_LENGTH);

  uint8_t unsafe_buffer[64];
  ng_field_t unsafe = {ng_bytes_from_cstr("__proto__.value"), false};
  assert(ng_update_begin(&update, scope, unsafe_buffer,
                         sizeof(unsafe_buffer)));
  assert(!ng_update_set_json(&update, unsafe, ng_bytes_from_cstr("1")));
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_UNSAFE_PATH);
}

static void test_observers(ng_scope_ref_t scope) {
  observer_state_t first = {0};
  observer_state_t second = {0};
  ng_watch_t first_watch = {0};
  ng_watch_t second_watch = {0};

  ng_test_set_buffer(80, ng_bytes_from_cstr("7"));
  ng_watch_options_t initial = {true};
  assert(ng_scope_observe(scope, PLAYER_HEALTH.base, initial, &first,
                          remember_update, &first_watch));
  assert(first.count == 1);
  assert(bytes_equal(first.update.path, "health"));
  assert(bytes_equal(first.update.value_json, "7"));
  assert(ng_watch_active(&first_watch));

  assert(ng_scope_observe(scope, PLAYER_HEALTH.base, NG_WATCH_OPTIONS_DEFAULT,
                          &second, remember_update, &second_watch));
  assert(first_watch.handle != second_watch.handle);

  static const char transaction[] =
      "{\"set\":{\"health\":8,\"position.x\":12.5},\"origin\":\"dom\"}";
  ng_scope_on_transaction(scope.handle, (const uint8_t *)transaction,
                          sizeof(transaction) - 1);
  assert(first.count == 2);
  assert(second.count == 1);
  assert(bytes_equal(first.update.value_json, "8"));
  assert(bytes_equal(first.update.origin_json, "\"dom\""));
  assert(!first.update.deleted);

  assert(ng_watch_cancel(&first_watch));
  assert(!ng_watch_active(&first_watch));
  static const char deletion[] =
      "{\"set\":{},\"delete\":[\"health\"],\"origin\":\"reset\"}";
  ng_scope_on_transaction(scope.handle, (const uint8_t *)deletion,
                          sizeof(deletion) - 1);
  assert(first.count == 2);
  assert(second.count == 2);
  assert(second.update.deleted);
  assert(second.update.value_json.len == 0);
  assert(bytes_equal(second.update.origin_json, "\"reset\""));

  ng_scope_on_unbind(scope.handle);
  assert(!ng_watch_active(&second_watch));
  assert(!ng_watch_cancel(&second_watch));
  assert(ng_abi_error() == NG_WASM_ABI_ERROR_INVALID_HANDLE);
}

static void test_lifecycle_callbacks(ng_scope_ref_t scope) {
  ng_set_scope_bind_callback(remember_bind);
  ng_set_scope_unbind_callback(remember_unbind);
  ng_set_scope_transaction_callback(remember_transaction);

  ng_scope_on_bind(scope.handle, (const uint8_t *)"todoList:main", 13);
  assert(last_bind_handle == scope.handle);
  assert(bytes_equal(last_bind_name, "todoList:main"));

  static const char transaction[] = "{\"set\":{\"newTodo\":\"Review C\"}}";
  ng_scope_on_transaction(scope.handle, (const uint8_t *)transaction,
                          sizeof(transaction) - 1);
  assert(last_transaction.scope_handle == scope.handle);
  assert(bytes_equal(last_transaction.transaction_json, transaction));

  ng_scope_on_unbind(scope.handle);
  assert(last_unbind_handle == scope.handle);

  ng_set_scope_bind_callback(NULL);
  ng_set_scope_unbind_callback(NULL);
  ng_set_scope_transaction_callback(NULL);
}

int main(void) {
  test_basics();

  ng_scope_ref_t scope = ng_scope_ref_from_name(ng_bytes_from_cstr("test:main"));
  assert(ng_scope_ref_valid(scope));
  test_owned_results(scope);
  test_atomic_updates(scope);
  test_observers(scope);
  test_lifecycle_callbacks(scope);

  return 0;
}
