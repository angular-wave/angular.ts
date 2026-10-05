window.angular
  .createModule("compileConfigDemo", ["ng"])
  .config({
    $compile: {
      strictComponentBindingsEnabled: true,
      mediaUrlPolicy: (url) => {
        if (url !== "media:test-resource") throw new Error("Media URL rejected");
        return url;
      },
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
      constructor() {
        this.strictEnabled = true;
        this.boundValue = "media:test-resource";
      }
    },
  );
