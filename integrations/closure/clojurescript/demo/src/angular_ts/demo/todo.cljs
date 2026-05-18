(ns angular-ts.demo.todo
  (:require [angular-ts.generated :as ng]
            [clojure.string :as string]
            [goog.object :as gobj]))

(defn- make-todo
  ^js/Object [^number id ^string task ^boolean done]
  (js-obj "id" id "task" task "done" done))

(defn- done?
  ^boolean [^js/Object todo]
  (gobj/get todo "done"))

(defn create-todo-controller
  ^js/Object []
  (let [next-id (atom 2)
        state (js-obj
                "newTodo" ""
                "tasks" #js [(make-todo 1 "Learn AngularTS from ClojureScript" false)
                              (make-todo 2 "Compile with Closure ADVANCED" false)])]
    (gobj/set state "submit"
      (fn [^js/Event event]
        (.preventDefault event)
        (this-as this
          (let [value (string/trim (str (or (gobj/get this "newTodo") "")))]
            (when-not (string/blank? value)
              (let [^js/Array tasks (gobj/get this "tasks")]
                (.push tasks (make-todo (swap! next-id inc) value false))
                (gobj/set this "newTodo" "")))))))
    (gobj/set state "setDone"
      (fn [^js/Object todo ^boolean done?]
        (gobj/set todo "done" done?)))
    (gobj/set state "archive"
      (fn []
        (this-as this
          (let [^js/Array tasks (gobj/get this "tasks")]
            (loop [index (dec (.-length tasks))]
              (when (>= index 0)
                (when (done? (aget tasks index))
                  (.splice tasks index 1))
                (recur (dec index))))))))
	    state))

(defonce registered?
  (let [module (ng/module "cljsTodo" #js [])
        controller (ng/injectable #js [] create-todo-controller)]
    (ng/ng-module-controller module "TodoCtrl" controller)
    true))
