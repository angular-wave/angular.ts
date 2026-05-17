#include "angular_ts/wasm.hpp"

#include <algorithm>
#include <cstddef>
#include <string>
#include <string_view>
#include <vector>

namespace {

struct Todo {
  std::string task;
  bool done = false;
};

std::string QuoteJson(std::string_view value) {
  std::string out = "\"";
  for (char ch : value) {
    if (ch == '"' || ch == '\\') {
      out.push_back('\\');
    }
    out.push_back(ch);
  }
  out.push_back('"');
  return out;
}

std::string DecodeFlatJsonString(std::string_view value) {
  if (value.size() >= 2 && value.front() == '"' && value.back() == '"') {
    return std::string(value.substr(1, value.size() - 2));
  }
  return std::string(value);
}

std::string Trim(std::string value) {
  const auto begin = std::find_if_not(value.begin(), value.end(), [](char ch) {
    return ch == ' ' || ch == '\n' || ch == '\r' || ch == '\t';
  });
  const auto end = std::find_if_not(value.rbegin(), value.rend(), [](char ch) {
                     return ch == ' ' || ch == '\n' || ch == '\r' || ch == '\t';
                   }).base();
  if (begin >= end) {
    return {};
  }
  return std::string(begin, end);
}

class TodoApp {
 public:
  void Bind(std::string_view scope_name) {
    current_app_ = this;
    angular_ts::SetScopeUpdateCallback(&TodoApp::OnScopeUpdate);

    scope_ = angular_ts::Scope::FromName(scope_name);
    watch_ = scope_.WatchPath("newTodo");
    items_ = {
        {"Learn AngularTS", false},
        {"Build a C++ Wasm app", false},
    };
    Sync();
  }

  void Unbind() {
    watch_.Unwatch();
    angular_ts::SetScopeUpdateCallback(nullptr);
    current_app_ = nullptr;
  }

  void Add(std::string title) {
    title = Trim(std::move(title));
    if (title.empty()) {
      return;
    }

    items_.push_back(Todo{title, false});
    new_todo_.clear();
    Sync();
  }

  void Toggle(std::size_t index) {
    if (index >= items_.size()) {
      return;
    }

    items_[index].done = !items_[index].done;
    Sync();
  }

  void ArchiveCompleted() {
    items_.erase(std::remove_if(items_.begin(), items_.end(),
                                [](const Todo& item) { return item.done; }),
                 items_.end());
    Sync();
  }

  std::size_t RemainingCount() const {
    return static_cast<std::size_t>(
        std::count_if(items_.begin(), items_.end(),
                      [](const Todo& item) { return !item.done; }));
  }

  std::size_t ItemCount() const { return items_.size(); }

  bool Done(std::size_t index) const {
    return index < items_.size() && items_[index].done;
  }

  std::string_view Task(std::size_t index) const {
    if (index >= items_.size()) {
      return {};
    }
    return items_[index].task;
  }

  std::string_view NewTodo() const { return new_todo_; }

 private:
  static void OnScopeUpdate(angular_ts::ScopeUpdate update) {
    if (current_app_ == nullptr || update.path != "newTodo") {
      return;
    }

    current_app_->new_todo_ = DecodeFlatJsonString(update.value_json);
  }

  std::string ItemsJson() const {
    std::string out = "[";
    for (std::size_t index = 0; index < items_.size(); ++index) {
      if (index != 0) {
        out += ",";
      }
      out += "{\"task\":";
      out += QuoteJson(items_[index].task);
      out += ",\"done\":";
      out += items_[index].done ? "true" : "false";
      out += "}";
    }
    out += "]";
    return out;
  }

  void Sync() const {
    scope_.SetJson("items", ItemsJson());
    scope_.SetJson("remainingCount", std::to_string(RemainingCount()));
    scope_.SetJson("newTodo", QuoteJson(new_todo_));
    scope_.Sync();
  }

  inline static TodoApp* current_app_ = nullptr;

  angular_ts::Scope scope_ = angular_ts::Scope::FromHandle(0);
  angular_ts::Watch watch_;
  std::vector<Todo> items_;
  std::string new_todo_;
};

#if defined(__wasm__)
#define TODO_EXPORT(name) __attribute__((export_name(#name)))
#else
#define TODO_EXPORT(name)
#endif

TodoApp app;

}  // namespace

extern "C" TODO_EXPORT(todo_bind) void todo_bind() { app.Bind("cppTodo:main"); }

extern "C" TODO_EXPORT(todo_add) void todo_add(const std::uint8_t* title_ptr,
                                               std::uint32_t title_len) {
  app.Add(std::string(reinterpret_cast<const char*>(title_ptr), title_len));
}

extern "C" TODO_EXPORT(todo_toggle) void todo_toggle(std::uint32_t index) {
  app.Toggle(index);
}

extern "C" TODO_EXPORT(todo_archive_completed) void todo_archive_completed() {
  app.ArchiveCompleted();
}

extern "C" TODO_EXPORT(todo_unbind) void todo_unbind() { app.Unbind(); }

int main() {
  todo_bind();
  if (app.ItemCount() != 2 || app.RemainingCount() != 2) {
    return 1;
  }

  const std::string_view path = "newTodo";
  const std::string_view value = "\"Review C++ bridge\"";
  ng_scope_on_update(
      12, reinterpret_cast<const std::uint8_t*>(path.data()),
      static_cast<std::uint32_t>(path.size()),
      reinterpret_cast<const std::uint8_t*>(value.data()),
      static_cast<std::uint32_t>(value.size()));
  if (app.NewTodo() != "Review C++ bridge") {
    return 1;
  }

  const std::string_view title = "Review C++ bridge";
  todo_add(reinterpret_cast<const std::uint8_t*>(title.data()),
           static_cast<std::uint32_t>(title.size()));
  if (app.ItemCount() != 3 || app.RemainingCount() != 3 ||
      !app.NewTodo().empty()) {
    return 1;
  }

  todo_toggle(0);
  if (!app.Done(0) || app.RemainingCount() != 2) {
    return 1;
  }

  todo_archive_completed();
  if (app.ItemCount() != 2 || app.RemainingCount() != 2 ||
      app.Task(0) != "Build a C++ Wasm app") {
    return 1;
  }

  todo_unbind();

  return 0;
}

#undef TODO_EXPORT
