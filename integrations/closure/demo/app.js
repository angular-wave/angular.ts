goog.module("angularTs.closureTodo");

const TodoController = goog.require("angularTs.closureTodo.TodoController");

/**
 * AngularTS controller factory.
 * @return {!TodoController}
 */
function createTodoController() {
  return new TodoController();
}

/**
 * Demo directive factory.
 * @return {!ng.Directive}
 */
function createClosureBadgeDirective() {
  return {
    "restrict": "A",
    "link": function (scope, element) {
      element.textContent =
        "Application JavaScript compiled with Closure ADVANCED and strict type checks";
    },
  };
}

/** @type {!ng.NgModule} */
const module = angular.module("closureTodo", []);

module
  .controller("TodoCtrl", [createTodoController])
  .directive("closureBadge", [createClosureBadgeDirective]);
