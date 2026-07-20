const securityConfig = {
  fallback: 'deny',
  allowInsecureTransport: false,
  credentials: {
    bearer: function getToken() {
      return 'demo-token';
    },
    cookie: true,
    order: ['bearer', 'cookie'],
  },
  permissions: ['admin:read'],
};

window.angular
  .module('securityConfigDemo', [])
  .config({
    $security: securityConfig,
  })
  .controller(
    'SecurityConfigCtrl',
    class {
      static $inject = ['$security'];

      constructor($security) {
        this.fallback = securityConfig.fallback;
        this.credentialOrder = securityConfig.credentials.order.join(', ');
        this.allowInsecureTransport = securityConfig.allowInsecureTransport;
        this.check = $security.check.bind($security);
      }
    },
  );
