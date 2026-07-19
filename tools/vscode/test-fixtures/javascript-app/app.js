angular.module("demoJs", [])
  .component("todoList", {
    template: `
      <section>
        <button type="button" ng-click="$ctrl.addTodo()">
          Add
        </button>
        <todo-row todo="$ctrl.selectedTodo"></todo-row>
      </section>
    `,
    bindings: {
      todos: "<",
      onAdd: "&?"
    },
    controller: function TodoListController() {}
  })
  .component("todoRow", {
    templateUrl: "todo-row.html",
    bindings: {
      todo: "<"
    }
  })
  .service("TodoApi", function() {});
