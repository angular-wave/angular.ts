angular.module("demo", [])
  .component("userCard", {
    templateUrl: "user-card.html",
    bindings: {
      user: "<",
      onSelect: "&?"
    },
    controller: function UserCardController() {}
  })
  .directive("activeWhen", function() {
    return {
      restrict: "A",
      scope: {
        activeWhen: "<"
      }
    };
  })
  .filter("activeOnly", function() {
    return function(items: Array<{ active: boolean }>) {
      return items.filter((item) => item.active);
    };
  })
  .controller("DemoController", function() {});
