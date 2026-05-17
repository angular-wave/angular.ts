#ifndef ANGULAR_TS_WASM_HPP_
#define ANGULAR_TS_WASM_HPP_

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <string>
#include <string_view>
#include <utility>

#if defined(__wasm__)
#define ANGULAR_TS_WASM_IMPORT(name) \
  __attribute__((import_module("angular_ts"), import_name(#name)))
#define ANGULAR_TS_WASM_EXPORT(name) __attribute__((export_name(#name)))
#else
#define ANGULAR_TS_WASM_IMPORT(name)
#define ANGULAR_TS_WASM_EXPORT(name)
#endif

namespace angular_ts {

using ScopeHandle = std::uint32_t;
using WatchHandle = std::uint32_t;
using BufferHandle = std::uint32_t;

struct Bytes {
  const std::uint8_t* data = nullptr;
  std::uint32_t size = 0;

  static Bytes FromString(std::string_view value) {
    return Bytes{
        reinterpret_cast<const std::uint8_t*>(value.data()),
        static_cast<std::uint32_t>(value.size()),
    };
  }

  bool empty() const { return size == 0; }
};

struct ScopeRef {
  ScopeHandle handle = 0;
  std::string_view name;

  static ScopeRef FromHandle(ScopeHandle value) {
    return ScopeRef{value, std::string_view{}};
  }

  static ScopeRef FromName(std::string_view value) {
    return ScopeRef{0, value};
  }

  bool valid() const { return handle != 0 || !name.empty(); }
  bool named() const { return handle == 0 && !name.empty(); }
};

struct ScopeUpdate {
  ScopeHandle scope_handle = 0;
  std::string_view path;
  std::string_view value_json;
};

using BindCallback = void (*)(ScopeHandle, std::string_view);
using UnbindCallback = void (*)(ScopeHandle);
using UpdateCallback = void (*)(ScopeUpdate);

namespace detail {

inline BindCallback& BindCallbackSlot() {
  static BindCallback callback = nullptr;
  return callback;
}

inline UnbindCallback& UnbindCallbackSlot() {
  static UnbindCallback callback = nullptr;
  return callback;
}

inline UpdateCallback& UpdateCallbackSlot() {
  static UpdateCallback callback = nullptr;
  return callback;
}

inline Bytes ToBytes(std::string_view value) { return Bytes::FromString(value); }

inline bool Status(std::uint32_t value) { return value != 0; }

#if !defined(__wasm__)
inline BufferHandle& NativeBufferHandleSlot() {
  static BufferHandle handle = 0;
  return handle;
}

inline std::string& NativeBufferValueSlot() {
  static std::string value;
  return value;
}

inline std::uint32_t& NativeBufferFreeCountSlot() {
  static std::uint32_t count = 0;
  return count;
}

inline BufferHandle& NativeFreedBufferSlot() {
  static BufferHandle handle = 0;
  return handle;
}
#endif

}  // namespace detail

#if !defined(__wasm__)
inline void ResetNativeTestHost() {
  detail::NativeBufferHandleSlot() = 0;
  detail::NativeBufferValueSlot().clear();
  detail::NativeBufferFreeCountSlot() = 0;
  detail::NativeFreedBufferSlot() = 0;
}

inline void SetNativeTestBuffer(BufferHandle handle, std::string_view value) {
  detail::NativeBufferHandleSlot() = handle;
  detail::NativeBufferValueSlot() = std::string(value);
}

inline std::uint32_t NativeTestBufferFreeCount() {
  return detail::NativeBufferFreeCountSlot();
}

inline BufferHandle NativeTestFreedBuffer() {
  return detail::NativeFreedBufferSlot();
}
#endif

}  // namespace angular_ts

extern "C" {

#if defined(__wasm__)
ANGULAR_TS_WASM_IMPORT(scope_resolve)
angular_ts::ScopeHandle angular_ts_scope_resolve(const std::uint8_t* name_ptr,
                                                 std::uint32_t name_len);
ANGULAR_TS_WASM_IMPORT(scope_get)
angular_ts::BufferHandle angular_ts_scope_get(
    angular_ts::ScopeHandle scope_handle, const std::uint8_t* path_ptr,
    std::uint32_t path_len);
ANGULAR_TS_WASM_IMPORT(scope_get_named)
angular_ts::BufferHandle angular_ts_scope_get_named(
    const std::uint8_t* name_ptr, std::uint32_t name_len,
    const std::uint8_t* path_ptr, std::uint32_t path_len);
ANGULAR_TS_WASM_IMPORT(scope_set)
std::uint32_t angular_ts_scope_set(angular_ts::ScopeHandle scope_handle,
                                   const std::uint8_t* path_ptr,
                                   std::uint32_t path_len,
                                   const std::uint8_t* value_ptr,
                                   std::uint32_t value_len);
ANGULAR_TS_WASM_IMPORT(scope_set_named)
std::uint32_t angular_ts_scope_set_named(
    const std::uint8_t* name_ptr, std::uint32_t name_len,
    const std::uint8_t* path_ptr, std::uint32_t path_len,
    const std::uint8_t* value_ptr, std::uint32_t value_len);
ANGULAR_TS_WASM_IMPORT(scope_delete)
std::uint32_t angular_ts_scope_delete(angular_ts::ScopeHandle scope_handle,
                                      const std::uint8_t* path_ptr,
                                      std::uint32_t path_len);
ANGULAR_TS_WASM_IMPORT(scope_delete_named)
std::uint32_t angular_ts_scope_delete_named(const std::uint8_t* name_ptr,
                                            std::uint32_t name_len,
                                            const std::uint8_t* path_ptr,
                                            std::uint32_t path_len);
ANGULAR_TS_WASM_IMPORT(scope_sync)
std::uint32_t angular_ts_scope_sync(angular_ts::ScopeHandle scope_handle);
ANGULAR_TS_WASM_IMPORT(scope_sync_named)
std::uint32_t angular_ts_scope_sync_named(const std::uint8_t* name_ptr,
                                          std::uint32_t name_len);
ANGULAR_TS_WASM_IMPORT(scope_watch)
angular_ts::WatchHandle angular_ts_scope_watch(
    angular_ts::ScopeHandle scope_handle, const std::uint8_t* path_ptr,
    std::uint32_t path_len);
ANGULAR_TS_WASM_IMPORT(scope_watch_named)
angular_ts::WatchHandle angular_ts_scope_watch_named(
    const std::uint8_t* name_ptr, std::uint32_t name_len,
    const std::uint8_t* path_ptr, std::uint32_t path_len);
ANGULAR_TS_WASM_IMPORT(scope_unwatch)
std::uint32_t angular_ts_scope_unwatch(angular_ts::WatchHandle watch_handle);
ANGULAR_TS_WASM_IMPORT(scope_unbind)
std::uint32_t angular_ts_scope_unbind(angular_ts::ScopeHandle scope_handle);
ANGULAR_TS_WASM_IMPORT(scope_unbind_named)
std::uint32_t angular_ts_scope_unbind_named(const std::uint8_t* name_ptr,
                                            std::uint32_t name_len);
ANGULAR_TS_WASM_IMPORT(buffer_ptr)
const std::uint8_t* angular_ts_buffer_ptr(
    angular_ts::BufferHandle buffer_handle);
ANGULAR_TS_WASM_IMPORT(buffer_len)
std::uint32_t angular_ts_buffer_len(angular_ts::BufferHandle buffer_handle);
ANGULAR_TS_WASM_IMPORT(buffer_free)
void angular_ts_buffer_free(angular_ts::BufferHandle buffer_handle);
#else
inline angular_ts::ScopeHandle angular_ts_scope_resolve(
    const std::uint8_t*, std::uint32_t) {
  return 0;
}
inline angular_ts::BufferHandle angular_ts_scope_get(
    angular_ts::ScopeHandle, const std::uint8_t*, std::uint32_t) {
  return 0;
}
inline angular_ts::BufferHandle angular_ts_scope_get_named(
    const std::uint8_t*, std::uint32_t, const std::uint8_t*, std::uint32_t) {
  return 0;
}
inline std::uint32_t angular_ts_scope_set(angular_ts::ScopeHandle,
                                          const std::uint8_t*, std::uint32_t,
                                          const std::uint8_t*,
                                          std::uint32_t) {
  return 0;
}
inline std::uint32_t angular_ts_scope_set_named(
    const std::uint8_t*, std::uint32_t, const std::uint8_t*, std::uint32_t,
    const std::uint8_t*, std::uint32_t) {
  return 0;
}
inline std::uint32_t angular_ts_scope_delete(angular_ts::ScopeHandle,
                                             const std::uint8_t*,
                                             std::uint32_t) {
  return 0;
}
inline std::uint32_t angular_ts_scope_delete_named(const std::uint8_t*,
                                                   std::uint32_t,
                                                   const std::uint8_t*,
                                                   std::uint32_t) {
  return 0;
}
inline std::uint32_t angular_ts_scope_sync(angular_ts::ScopeHandle) {
  return 0;
}
inline std::uint32_t angular_ts_scope_sync_named(const std::uint8_t*,
                                                 std::uint32_t) {
  return 0;
}
inline angular_ts::WatchHandle angular_ts_scope_watch(
    angular_ts::ScopeHandle, const std::uint8_t*, std::uint32_t) {
  return 0;
}
inline angular_ts::WatchHandle angular_ts_scope_watch_named(
    const std::uint8_t*, std::uint32_t, const std::uint8_t*, std::uint32_t) {
  return 0;
}
inline std::uint32_t angular_ts_scope_unwatch(angular_ts::WatchHandle) {
  return 0;
}
inline std::uint32_t angular_ts_scope_unbind(angular_ts::ScopeHandle) {
  return 0;
}
inline std::uint32_t angular_ts_scope_unbind_named(const std::uint8_t*,
                                                   std::uint32_t) {
  return 0;
}
inline const std::uint8_t* angular_ts_buffer_ptr(
    angular_ts::BufferHandle buffer_handle) {
  if (buffer_handle == angular_ts::detail::NativeBufferHandleSlot()) {
    return reinterpret_cast<const std::uint8_t*>(
        angular_ts::detail::NativeBufferValueSlot().data());
  }
  return nullptr;
}
inline std::uint32_t angular_ts_buffer_len(
    angular_ts::BufferHandle buffer_handle) {
  if (buffer_handle == angular_ts::detail::NativeBufferHandleSlot()) {
    return static_cast<std::uint32_t>(
        angular_ts::detail::NativeBufferValueSlot().size());
  }
  return 0;
}
inline void angular_ts_buffer_free(angular_ts::BufferHandle buffer_handle) {
  angular_ts::detail::NativeFreedBufferSlot() = buffer_handle;
  ++angular_ts::detail::NativeBufferFreeCountSlot();
}
#endif

}  // extern "C"

namespace angular_ts {

class ResultBuffer {
 public:
  ResultBuffer() = default;
  explicit ResultBuffer(BufferHandle handle) : handle_(handle) {}

  ResultBuffer(const ResultBuffer&) = delete;
  ResultBuffer& operator=(const ResultBuffer&) = delete;

  ResultBuffer(ResultBuffer&& other) noexcept : handle_(other.Release()) {}

  ResultBuffer& operator=(ResultBuffer&& other) noexcept {
    if (this != &other) {
      Reset();
      handle_ = other.Release();
    }
    return *this;
  }

  ~ResultBuffer() { Reset(); }

  bool Valid() const { return handle_ != 0; }
  BufferHandle handle() const { return handle_; }

  std::string ReadJson() {
    if (!Valid()) {
      return {};
    }

    const std::uint8_t* data = angular_ts_buffer_ptr(handle_);
    const std::uint32_t size = angular_ts_buffer_len(handle_);
    std::string out;
    if (data != nullptr && size != 0) {
      out.assign(reinterpret_cast<const char*>(data), size);
    }
    Reset();
    return out;
  }

  BufferHandle Release() {
    BufferHandle released = handle_;
    handle_ = 0;
    return released;
  }

  void Reset() {
    if (handle_ != 0) {
      angular_ts_buffer_free(handle_);
      handle_ = 0;
    }
  }

 private:
  BufferHandle handle_ = 0;
};

class Watch {
 public:
  Watch() = default;
  explicit Watch(WatchHandle handle) : handle_(handle) {}

  Watch(const Watch&) = delete;
  Watch& operator=(const Watch&) = delete;

  Watch(Watch&& other) noexcept : handle_(other.Release()) {}

  Watch& operator=(Watch&& other) noexcept {
    if (this != &other) {
      Unwatch();
      handle_ = other.Release();
    }
    return *this;
  }

  ~Watch() { Unwatch(); }

  bool Valid() const { return handle_ != 0; }
  WatchHandle handle() const { return handle_; }

  WatchHandle Release() {
    WatchHandle released = handle_;
    handle_ = 0;
    return released;
  }

  bool Unwatch() {
    if (handle_ == 0) {
      return false;
    }

    WatchHandle current = handle_;
    handle_ = 0;
    return detail::Status(angular_ts_scope_unwatch(current));
  }

 private:
  WatchHandle handle_ = 0;
};

class Scope {
 public:
  static Scope FromHandle(ScopeHandle handle) {
    return Scope(ScopeRef::FromHandle(handle));
  }

  static Scope FromName(std::string_view name) {
    return Scope(ScopeRef::FromName(name));
  }

  static Scope Resolve(std::string_view name) {
    if (name.empty()) {
      return Scope::FromHandle(0);
    }

    Bytes name_bytes = detail::ToBytes(name);
    return Scope::FromHandle(
        angular_ts_scope_resolve(name_bytes.data, name_bytes.size));
  }

  bool Valid() const { return ref_.valid(); }
  const ScopeRef& ref() const { return ref_; }

  ResultBuffer Get(std::string_view path) const {
    if (!Valid() || path.empty()) {
      return ResultBuffer();
    }

    Bytes path_bytes = detail::ToBytes(path);
    if (ref_.named()) {
      Bytes name_bytes = detail::ToBytes(ref_.name);
      return ResultBuffer(angular_ts_scope_get_named(
          name_bytes.data, name_bytes.size, path_bytes.data, path_bytes.size));
    }

    return ResultBuffer(
        angular_ts_scope_get(ref_.handle, path_bytes.data, path_bytes.size));
  }

  std::string GetJson(std::string_view path) const {
    return Get(path).ReadJson();
  }

  bool SetJson(std::string_view path, std::string_view json) const {
    if (!Valid() || path.empty()) {
      return false;
    }

    Bytes path_bytes = detail::ToBytes(path);
    Bytes json_bytes = detail::ToBytes(json);
    if (ref_.named()) {
      Bytes name_bytes = detail::ToBytes(ref_.name);
      return detail::Status(angular_ts_scope_set_named(
          name_bytes.data, name_bytes.size, path_bytes.data, path_bytes.size,
          json_bytes.data, json_bytes.size));
    }

    return detail::Status(angular_ts_scope_set(
        ref_.handle, path_bytes.data, path_bytes.size, json_bytes.data,
        json_bytes.size));
  }

  bool Delete(std::string_view path) const {
    if (!Valid() || path.empty()) {
      return false;
    }

    Bytes path_bytes = detail::ToBytes(path);
    if (ref_.named()) {
      Bytes name_bytes = detail::ToBytes(ref_.name);
      return detail::Status(angular_ts_scope_delete_named(
          name_bytes.data, name_bytes.size, path_bytes.data, path_bytes.size));
    }

    return detail::Status(
        angular_ts_scope_delete(ref_.handle, path_bytes.data, path_bytes.size));
  }

  bool Sync() const {
    if (!Valid()) {
      return false;
    }

    if (ref_.named()) {
      Bytes name_bytes = detail::ToBytes(ref_.name);
      return detail::Status(
          angular_ts_scope_sync_named(name_bytes.data, name_bytes.size));
    }

    return detail::Status(angular_ts_scope_sync(ref_.handle));
  }

  Watch WatchPath(std::string_view path) const {
    if (!Valid() || path.empty()) {
      return Watch();
    }

    Bytes path_bytes = detail::ToBytes(path);
    if (ref_.named()) {
      Bytes name_bytes = detail::ToBytes(ref_.name);
      return Watch(angular_ts_scope_watch_named(
          name_bytes.data, name_bytes.size, path_bytes.data, path_bytes.size));
    }

    return Watch(
        angular_ts_scope_watch(ref_.handle, path_bytes.data, path_bytes.size));
  }

  bool Unbind() const {
    if (!Valid()) {
      return false;
    }

    if (ref_.named()) {
      Bytes name_bytes = detail::ToBytes(ref_.name);
      return detail::Status(
          angular_ts_scope_unbind_named(name_bytes.data, name_bytes.size));
    }

    return detail::Status(angular_ts_scope_unbind(ref_.handle));
  }

 private:
  explicit Scope(ScopeRef ref) : ref_(ref) {}

  ScopeRef ref_;
};

inline void SetScopeBindCallback(BindCallback callback) {
  detail::BindCallbackSlot() = callback;
}

inline void SetScopeUnbindCallback(UnbindCallback callback) {
  detail::UnbindCallbackSlot() = callback;
}

inline void SetScopeUpdateCallback(UpdateCallback callback) {
  detail::UpdateCallbackSlot() = callback;
}

}  // namespace angular_ts

extern "C" ANGULAR_TS_WASM_EXPORT(ng_abi_alloc) inline void* ng_abi_alloc(
    std::uint32_t size) {
  if (size == 0) {
    return nullptr;
  }
  return std::malloc(size);
}

extern "C" ANGULAR_TS_WASM_EXPORT(ng_abi_free) inline void ng_abi_free(
    void* ptr, std::uint32_t) {
  std::free(ptr);
}

extern "C" ANGULAR_TS_WASM_EXPORT(ng_scope_on_bind) inline void
ng_scope_on_bind(angular_ts::ScopeHandle scope_handle,
                 const std::uint8_t* name_ptr, std::uint32_t name_len) {
  angular_ts::BindCallback callback =
      angular_ts::detail::BindCallbackSlot();
  if (callback != nullptr) {
    callback(scope_handle,
             std::string_view(reinterpret_cast<const char*>(name_ptr),
                              name_len));
  }
}

extern "C" ANGULAR_TS_WASM_EXPORT(ng_scope_on_unbind) inline void
ng_scope_on_unbind(angular_ts::ScopeHandle scope_handle) {
  angular_ts::UnbindCallback callback =
      angular_ts::detail::UnbindCallbackSlot();
  if (callback != nullptr) {
    callback(scope_handle);
  }
}

extern "C" ANGULAR_TS_WASM_EXPORT(ng_scope_on_update) inline void
ng_scope_on_update(angular_ts::ScopeHandle scope_handle,
                   const std::uint8_t* path_ptr, std::uint32_t path_len,
                   const std::uint8_t* value_ptr, std::uint32_t value_len) {
  angular_ts::UpdateCallback callback =
      angular_ts::detail::UpdateCallbackSlot();
  if (callback != nullptr) {
    callback(angular_ts::ScopeUpdate{
        scope_handle,
        std::string_view(reinterpret_cast<const char*>(path_ptr), path_len),
        std::string_view(reinterpret_cast<const char*>(value_ptr), value_len),
    });
  }
}

#undef ANGULAR_TS_WASM_IMPORT
#undef ANGULAR_TS_WASM_EXPORT

#endif  // ANGULAR_TS_WASM_HPP_
