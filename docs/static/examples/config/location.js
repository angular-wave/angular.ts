window.angular
  .module('locationConfigDemo', [])
  .config({
    $location: {
      html5Mode: {
        enabled: false,
        requireBase: false,
        rewriteLinks: true,
      },
      hashPrefix: '!',
    },
  })
  .controller(
    'LocationCtrl',
    class {
      static $inject = ['$location'];

      constructor($location) {
        this.$location = $location;
        this.currentUrl = $location.url();
      }

      openSettings() {
        this.$location.path('/settings').search({ tab: 'profile' });
        this.currentUrl = this.$location.url();
      }
    },
  );
