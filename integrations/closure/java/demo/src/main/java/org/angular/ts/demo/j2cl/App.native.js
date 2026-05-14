function registerJ2clTodoModule(controllerFactory, directiveFactory) {
  window["angular"]["module"]("j2clTodo", [])
    ["controller"]("TodoCtrl", ["$scope", controllerFactory])
    ["directive"]("j2clBadge", [directiveFactory]);
}

globalThis["j2clTodoMain"] = function() {
  App.m_start__void();
};
