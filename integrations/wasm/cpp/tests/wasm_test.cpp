#include "angular_ts/wasm.hpp"

#include <cassert>
#include <cstring>
#include <string_view>

namespace {

angular_ts::ScopeHandle last_bind_handle = 0;
std::string_view last_bind_name;
angular_ts::ScopeHandle last_unbind_handle = 0;
angular_ts::ScopeTransaction last_transaction;

void RememberBind(angular_ts::ScopeHandle scope_handle,
                  std::string_view name) {
  last_bind_handle = scope_handle;
  last_bind_name = name;
}

void RememberUnbind(angular_ts::ScopeHandle scope_handle) {
  last_unbind_handle = scope_handle;
}

void RememberTransaction(angular_ts::ScopeTransaction transaction) {
  last_transaction = transaction;
}

}  // namespace

int main() {
  assert(ng_abi_version() == angular_ts::kWasmAbiVersion);

  angular_ts::Bytes bytes = angular_ts::Bytes::FromString("todo");
  assert(bytes.size == 4);
  assert(!bytes.empty());

  angular_ts::Scope invalid = angular_ts::Scope::FromHandle(0);
  assert(!invalid.Valid());
  assert(invalid.GetJson("title").empty());
  assert(!invalid.SetJson("title", "\"Todo\""));
  assert(!invalid.Delete("title"));
  assert(!invalid.Sync());
  assert(!invalid.WatchPath("title").Valid());
  assert(!invalid.Unbind());

  angular_ts::Scope named = angular_ts::Scope::FromName("todoList:main");
  assert(!named.Valid());

  angular_ts::Scope resolved = angular_ts::Scope::Resolve("missing");
  assert(!resolved.Valid());

  void* allocation = ng_abi_alloc(8);
  assert(allocation != nullptr);
  std::memcpy(allocation, "Angular", 8);
  ng_abi_free(allocation, 8);

  angular_ts::ResetNativeTestHost();
  angular_ts::SetNativeTestBuffer(77, "{\"title\":\"Todo\"}");
  {
    angular_ts::ResultBuffer buffer(77);
    assert(buffer.Valid());
    assert(buffer.ReadJson() == "{\"title\":\"Todo\"}");
    assert(!buffer.Valid());
  }
  assert(angular_ts::NativeTestBufferFreeCount() == 1);
  assert(angular_ts::NativeTestFreedBuffer() == 77);

  angular_ts::ResetNativeTestHost();
  angular_ts::SetNativeTestBuffer(88, "\"released\"");
  {
    angular_ts::ResultBuffer buffer(88);
    assert(buffer.Release() == 88);
  }
  assert(angular_ts::NativeTestBufferFreeCount() == 0);

  angular_ts::SetScopeBindCallback(&RememberBind);
  angular_ts::SetScopeUnbindCallback(&RememberUnbind);
  angular_ts::SetScopeTransactionCallback(&RememberTransaction);

  const std::string_view scope_name = "todoList:main";
  ng_scope_on_bind(
      12, reinterpret_cast<const std::uint8_t*>(scope_name.data()),
      static_cast<std::uint32_t>(scope_name.size()));
  assert(last_bind_handle == 12);
  assert(last_bind_name == "todoList:main");

  ng_scope_on_unbind(12);
  assert(last_unbind_handle == 12);

  const std::string_view transaction =
      "{\"set\":{\"newTodo\":\"Review C++\"}}";
  ng_scope_on_transaction(
      12, reinterpret_cast<const std::uint8_t*>(transaction.data()),
      static_cast<std::uint32_t>(transaction.size()));
  assert(last_transaction.scope_handle == 12);
  assert(last_transaction.transaction_json == transaction);

  angular_ts::SetScopeBindCallback(nullptr);
  angular_ts::SetScopeUnbindCallback(nullptr);
  angular_ts::SetScopeTransactionCallback(nullptr);

  return 0;
}
