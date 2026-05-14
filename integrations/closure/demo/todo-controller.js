goog.module("angularTs.closureTodo.TodoController");

const Todo = goog.require("angularTs.closureTodo.Todo");

/**
 * Closure-annotated todo controller that mirrors the repository's simple todo
 * app while compiling as user code against AngularTS externs.
 * @constructor
 * @final
 */
function TodoController() {
  /** @type {string} */
  this["greeting"] = "Closure Todo App";
  /** @private {number} */
  this.nextId_ = 3;
  /** @type {string} */
  this["newTodo"] = "";
  /** @type {number} */
  this["remainingCount"] = 2;
  /** @type {!Array<!Todo>} */
  this["tasks"] = [
    new Todo(1, "Learn AngularTS", false),
    new Todo(2, "Compile the todo app with Closure", false),
  ];
}

/**
 * Adds a todo from the current input value.
 * @param {string} task
 * @return {void}
 */
TodoController.prototype["add"] = function (task) {
  const value = String(task || "").trim();

  if (!value) return;

  this["tasks"] = this["tasks"].concat(new Todo(this.nextId_++, value, false));
  this["newTodo"] = "";
  this.syncRemaining_();
};

/**
 * Updates the template-facing input value.
 * @param {string} value
 * @return {void}
 */
TodoController.prototype["setNewTodo"] = function (value) {
  this["newTodo"] = String(value || "");
};

/**
 * Adds the current input value from a form submit.
 * @param {?Event=} event
 * @return {void}
 */
TodoController.prototype["submit"] = function (event) {
  if (event) event.preventDefault();
  this["add"](this["newTodo"]);
};

/**
 * Sets a todo completion flag from the checkbox state.
 * @param {!Todo} todo
 * @param {boolean} done
 * @return {void}
 */
TodoController.prototype["setDone"] = function (todo, done) {
  todo["done"] = done;
  this.syncRemaining_();
};

/**
 * Toggles a todo completion flag.
 * @param {!Todo} todo
 * @return {void}
 */
TodoController.prototype["toggle"] = function (todo) {
  this["setDone"](todo, !todo["done"]);
};

/**
 * Removes completed todos.
 * @return {void}
 */
TodoController.prototype["archive"] = function () {
  this["tasks"] = this["tasks"].filter(function (todo) {
    return !todo["done"];
  });
  this.syncRemaining_();
};

/**
 * Synchronizes the template-facing remaining count.
 * @return {number}
 * @private
 */
TodoController.prototype.syncRemaining_ = function () {
  this["remainingCount"] = this["tasks"].filter(function (todo) {
    return !todo["done"];
  }).length;
  return this["remainingCount"];
};

exports = TodoController;
