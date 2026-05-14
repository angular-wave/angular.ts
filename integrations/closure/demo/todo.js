goog.module("angularTs.closureTodo.Todo");

/**
 * Todo item shape used by the template. Quoted properties intentionally keep
 * the public runtime names stable under Closure ADVANCED property renaming.
 * @constructor
 * @final
 * @param {number} id
 * @param {string} task
 * @param {boolean=} done
 */
function Todo(id, task, done) {
  /** @type {number} */
  this["id"] = id;
  /** @type {string} */
  this["task"] = task;
  /** @type {boolean} */
  this["done"] = done || false;
}

exports = Todo;
