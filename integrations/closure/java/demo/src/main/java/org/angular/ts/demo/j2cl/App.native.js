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
    "tasks": snapshotTodos(controller),
    "add": function(task) {
      controller["add"](task);
      syncTodoModel(this, controller);
    },
    "toggle": function(todo) {
      const controllerTodo = findTodo(controller, todo["id"]);
      if (controllerTodo) {
        controller["toggle"](controllerTodo);
      }
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
  model["tasks"] = snapshotTodos(controller);
}

function snapshotTodos(controller) {
  return controller["tasks"].map(function(todo) {
    return {
      "id": todo["id"],
      "task": todo["task"],
      "done": todo["done"],
    };
  });
}

function findTodo(controller, id) {
  const tasks = controller["tasks"];
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i]["id"] === id) {
      return tasks[i];
    }
  }

  return null;
}

globalThis["j2clTodoMain"] = function() {
  App.m_start__void();
};
