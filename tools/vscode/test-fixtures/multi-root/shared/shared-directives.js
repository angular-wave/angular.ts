angular.module("sharedUi", [])
  .directive("auditLog", function() {
    return {
      restrict: "A",
      scope: {
        auditLog: "<"
      }
    };
  })
  .filter("displayName", function() {
    return function(user) {
      return user && user.name ? user.name : "Unknown";
    };
  });
