package org.angular.ts;

import org.angular.ts.ng.Model;

/** Compile-time coverage for model access through both Java runtime facades. */
final class ModelGetterCompileTest {
  private ModelGetterCompileTest() {}

  static Model<Object> globalModel() {
    return Angular.getModel("cart");
  }

  static Model<Object> runtimeModel(org.angular.ts.ng.Angular runtime) {
    return runtime.getModel("cart");
  }
}
