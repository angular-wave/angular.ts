window.angular
  .module('httpConfigDemo', [])
  .config({
    $http: {
      defaults: {
        headers: {
          common: {
            'X-App': 'docs',
          },
          post: {
            'X-Mode': 'configured',
          },
        },
        withCredentials: true,
        xsrfCookieName: 'APP-XSRF',
        xsrfHeaderName: 'X-APP-XSRF',
      },
      interceptors: [
        () => ({
          request(config) {
            config.headers['X-Configured'] = 'true';
            return config;
          },
        }),
      ],
      xsrfTrustedOrigins: ['https://api.example.com'],
    },
  })
  .controller(
    'HttpConfigCtrl',
    class {
      static $inject = ['$http'];

      constructor($http) {
        this.withCredentials = $http.defaults.withCredentials;
        this.xsrfCookieName = $http.defaults.xsrfCookieName;
        this.appHeader = $http.defaults.headers.common['X-App'];
      }
    },
  );
