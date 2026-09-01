window.angular
  .createModule('locationConfigDemo', [])
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
        this.currentUrl = $location.getUrl();
      }

      openSettings() {
        this.$location.setPath('/settings').setSearch({ tab: 'profile' });
        this.currentUrl = this.$location.getUrl();
      }
    },
  );
