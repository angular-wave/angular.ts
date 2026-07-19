angular.module("adminApp", [])
  .component("adminPanel", {
    templateUrl: "admin-panel.html",
    bindings: {
      user: "<"
    }
  })
  .service("AdminApi", function() {});
