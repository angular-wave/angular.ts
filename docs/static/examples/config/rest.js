window.angular
  .createModule('restConfigDemo', [])
  .config({
    $rest: {
      defaults: {
        credentials: 'include',
        timeout: 5000,
      },
    },
  })
  .controller(
    'RestConfigCtrl',
    class {
      static $inject = ['$http', '$rest'];

      constructor($http, $rest) {
        this.httpCredentials = $http.defaults.credentials;
        this.users = $rest('/api/users', undefined, {});
        this.resourceType = typeof this.users.list === 'function';
      }
    },
  );
