window.angular
  .module('configDemo', [])
  .config({
    $log: {
      debug: true,
    },
    $cookie: {
      defaults: {
        path: '/',
        samesite: 'Lax',
      },
    },
  })
  .controller(
    'ConfigCtrl',
    class {
      static $inject = ['$cookie', '$log'];

      constructor($cookie, $log) {
        this.$cookie = $cookie;
        this.$log = $log;
        this.message = 'No preference saved yet.';
      }

      save() {
        this.$cookie.put('theme', 'dark');
        this.message = `Saved theme: ${this.$cookie.get('theme')}`;
        this.$log.debug('Preference saved with configured logging.');
      }
    },
  );
