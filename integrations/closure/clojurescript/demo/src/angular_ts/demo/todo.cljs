(ns angular-ts.demo.todo
  (:require [angular-ts.generated :as ng]
            [clojure.string :as string]
            [goog.object :as gobj]))

(set! *warn-on-infer* true)

(def ^:private prop-add "add")
(def ^:private prop-archive "archive")
(def ^:private prop-done "done")
(def ^:private prop-greeting "greeting")
(def ^:private prop-id "id")
(def ^:private prop-new-todo "newTodo")
(def ^:private prop-remaining-count "remainingCount")
(def ^:private prop-set-done "setDone")
(def ^:private prop-set-new-todo "setNewTodo")
(def ^:private prop-submit "submit")
(def ^:private prop-task "task")
(def ^:private prop-tasks "tasks")
(def ^:private prop-toggle "toggle")

(defn- get-tasks
  ^js/Array [^js/Object state]
  (gobj/get state prop-tasks))

(defn- make-todo
  ^js/Object [^number id ^string task ^boolean done]
  (js-obj prop-id id prop-task task prop-done done))

(defn- todo-done?
  ^boolean [^js/Object todo]
  (gobj/get todo prop-done))

(defn- set-todo-done!
  [^js/Object todo ^boolean done]
  (gobj/set todo prop-done done))

(defn- set-state-property!
  [^js/Object state ^string property value]
  (gobj/set state property value))

(defn- sync-remaining!
  ^number [^js/Object state]
  (let [^js/Array tasks (get-tasks state)
        ^js/Array remaining (.filter tasks (fn [todo] (not (todo-done? todo))))
        count (.-length remaining)]
    (set-state-property! state prop-remaining-count count)
    count))

(defn- add-todo!
  [^js/Object state next-id task]
  (let [value (string/trim (str (or task "")))]
    (when-not (string/blank? value)
      (let [id (swap! next-id inc)
            ^js/Array tasks (get-tasks state)]
        (set-state-property! state prop-tasks (.concat tasks (make-todo id value false)))
        (set-state-property! state prop-new-todo "")
        (sync-remaining! state)))))

(defn- toggle-todo!
  [^js/Object state ^js/Object todo]
  (let [done? (not (todo-done? todo))]
    (set-todo-done! todo done?)
    (sync-remaining! state)))

(defn- set-done!
  [^js/Object state ^js/Object todo ^boolean done?]
  (set-todo-done! todo done?)
  (sync-remaining! state))

(defn- submit!
  [^js/Object state next-id event]
  (when event
    (.preventDefault ^js/Event event))
  (add-todo! state next-id (gobj/get state prop-new-todo)))

(defn- archive-completed!
  [^js/Object state]
  (let [^js/Array tasks (get-tasks state)
        ^js/Array active (.filter tasks (fn [todo] (not (todo-done? todo))))]
    (set-state-property! state prop-tasks active)
    (sync-remaining! state)))

(defn create-todo-controller
  "AngularTS controller constructor. AngularTS invokes this through DI; the
  returned JS object becomes the controller instance."
  ^js/Object []
  (let [next-id (atom 2)
        state (js-obj
                prop-greeting "ClojureScript Todo App"
                prop-new-todo ""
                prop-remaining-count 2
                prop-tasks #js [(make-todo 1 "Learn AngularTS from ClojureScript" false)
                                (make-todo 2 "Compile with Closure ADVANCED" false)])]
    (set-state-property! state prop-set-new-todo
      (fn [value]
        (this-as this
          (set-state-property! this prop-new-todo value))))
    (set-state-property! state prop-add
      (fn [task]
        (this-as this
          (add-todo! this next-id task))))
    (set-state-property! state prop-submit
      (fn [event]
        (this-as this
          (submit! this next-id event))))
    (set-state-property! state prop-set-done
      (fn [todo done?]
        (this-as this
          (set-done! this todo done?))))
    (set-state-property! state prop-toggle
      (fn [todo]
        (this-as this
          (toggle-todo! this todo))))
    (set-state-property! state prop-archive
      (fn []
        (this-as this
          (archive-completed! this))))
    state))

(defn create-cljs-badge-directive
  ^js/ng.Directive
  []
  (js-obj
    "restrict" "A"
    "link" (fn [_scope element _attrs]
             (set! (.-textContent ^js/Element element)
               "ClojureScript compiled with Closure ADVANCED using generated AngularTS type hints"))))

(defonce registered?
  (let [module (ng/module "cljsTodo" #js [])
        controller (ng/injectable #js [] create-todo-controller)
        directive (ng/injectable #js [] create-cljs-badge-directive)]
    (ng/controller module "TodoCtrl" controller)
    (ng/directive module "cljsBadge" directive)
    true))
