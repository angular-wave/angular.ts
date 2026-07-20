function registerJ2clTodoModule(controllerFactory, directiveFactory) {
  window["angular"]["module"]("j2clTodo", [])
    ["model"]("todoModel", function() {
      return createTodoModel(controllerFactory());
    })
    ["controller"]("TodoCtrl", ["todoModel", function(todoModel) {
      return todoModel;
    }])
    ["directive"]("j2clBadge", [directiveFactory]);
}

function createTodoModel(controller) {
  return {
    "greeting": controller["greeting"],
    "newTodo": controller["newTodo"],
    "remainingCount": controller["remainingCount"],
    "tasks": controller["tasks"],
    "add": function(task) {
      controller["add"](task);
      syncTodoModel(this, controller);
    },
    "toggle": function(todo) {
      controller["toggle"](todo);
      syncTodoModel(this, controller);
    },
    "archive": function() {
      controller["archive"]();
      syncTodoModel(this, controller);
    },
  };
}

function syncTodoModel(model, controller) {
  model["newTodo"] = controller["newTodo"];
  model["remainingCount"] = controller["remainingCount"];
  model["tasks"] = controller["tasks"];
}

globalThis["j2clTodoMain"] = function() {
  App.m_start__void();
};
