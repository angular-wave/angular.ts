(ns angular-ts.demo.todo
  (:require [angular-ts.core :as ng]
            [clojure.string :as string]
            [goog.object :as gobj]))

(defn- new-todo ^js/Object [^string task]
  (js-obj "task" task "done" false))

(defn- add!
  [^js/Object controller]
  (when-let [task (some-> (gobj/get controller "newTodo")
                          str
                          string/trim
                          not-empty)]
    (gobj/set controller "tasks"
              (-> (gobj/get controller "tasks")
                  vec
                  (conj (new-todo task))
                  to-array))
    (gobj/set controller "newTodo" "")))

(defn- archive!
  [^js/Object controller]
  (gobj/set controller "tasks"
            (->> (gobj/get controller "tasks")
                 (remove #(gobj/get % "done"))
                 to-array)))

(defn- create-todo-model ^js/Object []
  (js-obj
   "newTodo" ""
   "tasks" #js [(new-todo "Learn AngularTS from ClojureScript")
                (new-todo "Compile with Closure ADVANCED")]))

(defn- create-todo-controller ^js/Object [^js/ng.Model model]
  (gobj/set model "add" #(add! model))
  (gobj/set model "archive" #(archive! model))
  model)

(defonce app
  (-> (ng/create-module "cljsTodo" [])
      (ng/model "todoModel" [] create-todo-model)
      (ng/controller "TodoCtrl" ["todoModel"] create-todo-controller)))
