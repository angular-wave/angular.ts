window.angular
  .module("restConfigDemo", [])
  .config({
    $rest: {
      defaults: {
        withCredentials: true,
        timeout: 5000,
      },
    },
  })
  .controller(
    "RestConfigCtrl",
    class {
      static $inject = ["$http", "$rest"];

      constructor($http, $rest) {
        this.httpCredentials = $http.defaults.withCredentials;
        this.users = $rest("/api/users", undefined, {});
        this.resourceType = typeof this.users.list === "function";
      }
    },
  );
