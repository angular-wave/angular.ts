#include "angular_ts_wasm.h"

#include <stdbool.h>
#include <stddef.h>

#if defined(__wasm__)
#define TODO_EXPORT(name) __attribute__((export_name(#name)))
#else
#define TODO_EXPORT(name)
#endif

enum { kMaxItems = 8, kMaxTask = 64, kJsonSize = 1024 };

typedef struct {
  char task[kMaxTask];
  bool done;
} todo_item_t;

typedef struct {
  ng_scope_ref_t scope;
  ng_watch_handle_t watch;
  todo_item_t items[kMaxItems];
  size_t item_count;
  char new_todo[kMaxTask];
} todo_app_t;

static todo_app_t *current_app;

static size_t text_len(const char *value) {
  size_t len = 0;
  while (value[len] != '\0') {
    ++len;
  }
  return len;
}

static bool text_equal(const char *left, const char *right) {
  size_t index = 0;
  while (left[index] != '\0' && right[index] != '\0') {
    if (left[index] != right[index]) {
      return false;
    }
    ++index;
  }
  return left[index] == right[index];
}

static void copy_bytes(void *target, const void *source, size_t len) {
  uint8_t *target_bytes = (uint8_t *)target;
  const uint8_t *source_bytes = (const uint8_t *)source;
  for (size_t index = 0; index < len; ++index) {
    target_bytes[index] = source_bytes[index];
  }
}

static void zero_bytes(void *target, size_t len) {
  uint8_t *target_bytes = (uint8_t *)target;
  for (size_t index = 0; index < len; ++index) {
    target_bytes[index] = 0;
  }
}

static void copy_text(char *target, size_t target_size, const char *source) {
  if (target_size == 0) {
    return;
  }

  size_t index = 0;
  while (index + 1 < target_size && source[index] != '\0') {
    target[index] = source[index];
    ++index;
  }
  target[index] = '\0';
}

static bool bytes_equal(ng_bytes_t bytes, const char *value) {
  size_t value_len = text_len(value);
  if (bytes.len != value_len) {
    return false;
  }

  for (size_t index = 0; index < value_len; ++index) {
    if (bytes.ptr[index] != (uint8_t)value[index]) {
      return false;
    }
  }
  return true;
}

static void decode_flat_json_string(ng_bytes_t value, char *target,
                                    size_t target_size) {
  if (target_size == 0) {
    return;
  }
  target[0] = '\0';

  if (value.len >= 2 && value.ptr[0] == '"' &&
      value.ptr[value.len - 1] == '"') {
    uint32_t len = value.len - 2;
    if (len >= target_size) {
      len = (uint32_t)target_size - 1;
    }
    copy_bytes(target, value.ptr + 1, len);
    target[len] = '\0';
    return;
  }

  uint32_t len = value.len;
  if (len >= target_size) {
    len = (uint32_t)target_size - 1;
  }
  copy_bytes(target, value.ptr, len);
  target[len] = '\0';
}

static size_t append_text(char *out, size_t capacity, size_t offset,
                          const char *value) {
  while (offset + 1 < capacity && *value != '\0') {
    out[offset] = *value;
    ++offset;
    ++value;
  }
  if (capacity != 0) {
    out[offset < capacity ? offset : capacity - 1] = '\0';
  }
  return offset;
}

static size_t append_json_string(char *out, size_t capacity, size_t offset,
                                 const char *value) {
  offset = append_text(out, capacity, offset, "\"");
  for (const char *cursor = value; *cursor != '\0' && offset + 2 < capacity;
       ++cursor) {
    if (*cursor == '"' || *cursor == '\\') {
      out[offset++] = '\\';
    }
    out[offset++] = *cursor;
    out[offset] = '\0';
  }
  return append_text(out, capacity, offset, "\"");
}

static void write_size(char *out, size_t capacity, size_t value) {
  char reversed[32];
  size_t count = 0;

  if (capacity == 0) {
    return;
  }

  if (value == 0) {
    out[0] = '0';
    out[1 < capacity ? 1 : 0] = '\0';
    return;
  }

  while (value != 0 && count < sizeof(reversed)) {
    reversed[count++] = (char)('0' + (value % 10));
    value /= 10;
  }

  size_t index = 0;
  while (index + 1 < capacity && count != 0) {
    out[index++] = reversed[--count];
  }
  out[index] = '\0';
}

static size_t todo_remaining_count(const todo_app_t *app) {
  size_t count = 0;
  for (size_t index = 0; index < app->item_count; ++index) {
    if (!app->items[index].done) {
      ++count;
    }
  }
  return count;
}

static void todo_items_json(const todo_app_t *app, char *out, size_t capacity) {
  size_t offset = append_text(out, capacity, 0, "[");
  for (size_t index = 0; index < app->item_count; ++index) {
    if (index != 0) {
      offset = append_text(out, capacity, offset, ",");
    }
    offset = append_text(out, capacity, offset, "{\"task\":");
    offset = append_json_string(out, capacity, offset, app->items[index].task);
    offset = append_text(out, capacity, offset, ",\"done\":");
    offset = append_text(out, capacity, offset,
                         app->items[index].done ? "true" : "false");
    offset = append_text(out, capacity, offset, "}");
  }
  append_text(out, capacity, offset, "]");
}

static void todo_sync(const todo_app_t *app) {
  char json[kJsonSize];
  char number[32];

  todo_items_json(app, json, sizeof(json));
  ng_scope_set_json(app->scope, ng_bytes_from_cstr("items"),
                    ng_bytes_from_cstr(json));

  write_size(number, sizeof(number), todo_remaining_count(app));
  ng_scope_set_json(app->scope, ng_bytes_from_cstr("remainingCount"),
                    ng_bytes_from_cstr(number));

  append_json_string(json, sizeof(json), 0, app->new_todo);
  ng_scope_set_json(app->scope, ng_bytes_from_cstr("newTodo"),
                    ng_bytes_from_cstr(json));

  ng_scope_sync_ref(app->scope);
}

static void todo_on_update(ng_scope_update_t update) {
  if (current_app == NULL || !bytes_equal(update.path, "newTodo")) {
    return;
  }

  decode_flat_json_string(update.value_json, current_app->new_todo,
                          sizeof(current_app->new_todo));
}

static void todo_app_bind(todo_app_t *app, const char *scope_name) {
  zero_bytes(app, sizeof(*app));
  app->scope = ng_scope_ref_from_name(ng_bytes_from_cstr(scope_name));
  current_app = app;
  ng_set_scope_update_callback(todo_on_update);

  app->watch = ng_scope_watch_path(app->scope, ng_bytes_from_cstr("newTodo"));
  app->item_count = 2;
  copy_text(app->items[0].task, sizeof(app->items[0].task), "Learn AngularTS");
  copy_text(app->items[1].task, sizeof(app->items[1].task),
            "Build a C Wasm app");

  todo_sync(app);
}

static void todo_app_unbind(todo_app_t *app) {
  ng_scope_unwatch_handle(app->watch);
  ng_set_scope_update_callback(NULL);
  current_app = NULL;
}

static void todo_app_add(todo_app_t *app, const char *title) {
  if (title[0] == '\0' || app->item_count >= kMaxItems) {
    return;
  }

  copy_text(app->items[app->item_count].task,
            sizeof(app->items[app->item_count].task), title);
  app->items[app->item_count].done = false;
  ++app->item_count;
  app->new_todo[0] = '\0';
  todo_sync(app);
}

static void todo_app_toggle(todo_app_t *app, size_t index) {
  if (index >= app->item_count) {
    return;
  }

  app->items[index].done = !app->items[index].done;
  todo_sync(app);
}

static void todo_app_archive_completed(todo_app_t *app) {
  size_t write = 0;
  for (size_t read = 0; read < app->item_count; ++read) {
    if (!app->items[read].done) {
      if (write != read) {
        app->items[write] = app->items[read];
      }
      ++write;
    }
  }
  app->item_count = write;
  todo_sync(app);
}

static todo_app_t app;

TODO_EXPORT(todo_bind)
void todo_bind(void) { todo_app_bind(&app, "cTodo:main"); }

TODO_EXPORT(todo_add)
void todo_add(const uint8_t *title_ptr, uint32_t title_len) {
  char title[kMaxTask];
  if (title_len >= sizeof(title)) {
    title_len = sizeof(title) - 1;
  }
  copy_bytes(title, title_ptr, title_len);
  title[title_len] = '\0';
  todo_app_add(&app, title);
}

TODO_EXPORT(todo_toggle)
void todo_toggle(uint32_t index) { todo_app_toggle(&app, index); }

TODO_EXPORT(todo_archive_completed)
void todo_archive_completed(void) { todo_app_archive_completed(&app); }

TODO_EXPORT(todo_unbind)
void todo_unbind(void) { todo_app_unbind(&app); }

int main(void) {
  todo_bind();
  if (app.item_count != 2 || todo_remaining_count(&app) != 2) {
    return 1;
  }

  ng_scope_on_update(12, (const uint8_t *)"newTodo", 7,
                     (const uint8_t *)"\"Review C bridge\"", 17);
  if (!text_equal(app.new_todo, "Review C bridge")) {
    return 1;
  }

  todo_add((const uint8_t *)"Review C bridge", 15);
  if (app.item_count != 3 || todo_remaining_count(&app) != 3 ||
      app.new_todo[0] != '\0') {
    return 1;
  }

  todo_toggle(0);
  if (!app.items[0].done || todo_remaining_count(&app) != 2) {
    return 1;
  }

  todo_archive_completed();
  if (app.item_count != 2 || todo_remaining_count(&app) != 2 ||
      !text_equal(app.items[0].task, "Build a C Wasm app")) {
    return 1;
  }

  todo_unbind();

  return 0;
}

#undef TODO_EXPORT
