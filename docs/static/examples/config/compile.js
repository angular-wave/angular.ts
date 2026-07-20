window.angular
  .module("compileConfigDemo", ["ng"])
  .config({
    $compile: {
      strictComponentBindingsEnabled: true,
      propertySecurityContexts: [
        {
          elementName: "div",
          propertyName: "title",
          context: "mediaUrl",
        },
      ],
    },
  })
  .component("userCard", {
    bindings: {
      name: "@",
    },
    template:
      "<section><h2 ng-bind=\"'Hello ' + $ctrl.name\"></h2><p ng-bind=\"status\"></p></section>",
    controller() {
      this.status = "strict component mode is active";
    },
  })
  .controller(
    "CompileConfigCtrl",
    class {
      static $inject = ["$sce"];

      constructor($sce) {
        this.strictEnabled = true;
        this.boundValue = $sce.trustAsMediaUrl("media:test-resource");
      }
    },
  );
