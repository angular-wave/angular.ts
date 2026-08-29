(ns angular-ts.core-test
  (:require [angular-ts.core :as ng]
            [cljs.test :refer-macros [deftest is testing]]))

(deftest injectable-converts-dependencies-to-an-annotated-array
  (let [factory (fn [] nil)
        annotated (ng/injectable ["first" "second"] factory)]
    (is (array? annotated))
    (is (= 3 (alength annotated)))
    (is (= "first" (aget annotated 0)))
    (is (= "second" (aget annotated 1)))
    (is (identical? factory (aget annotated 2)))))

(deftest controller-returns-the-module-and-annotates-dependencies
  (let [calls (atom [])
        module (js-obj)
        factory (fn [] nil)]
    (aset module "controller"
          (fn [name annotated]
            (swap! calls conj [name annotated])
            module))

    (is (identical? module
                    (ng/controller module "DemoCtrl" ["service"] factory)))
    (let [[name annotated] (first @calls)]
      (is (= "DemoCtrl" name))
      (is (= "service" (aget annotated 0)))
      (is (identical? factory (aget annotated 1))))))

(deftest publish-preserves-event-bus-arities
  (let [calls (atom [])
        event-bus (js-obj)]
    (aset event-bus "publish"
          (fn [& args]
            (swap! calls conj args)
            true))

    (testing "topic only"
      (is (true? (ng/publish event-bus "ready"))))
    (testing "topic and value"
      (is (true? (ng/publish event-bus "ready" 42))))
    (testing "topic, value, and metadata"
      (is (true? (ng/publish event-bus "ready" 42 #js {:source "test"}))))
    (is (= ["ready"] (first @calls)))
    (is (= ["ready" 42] (second @calls)))
    (let [[topic value metadata] (nth @calls 2)]
      (is (= "ready" topic))
      (is (= 42 value))
      (is (= "test" (.-source metadata))))))
