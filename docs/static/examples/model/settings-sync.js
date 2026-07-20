window.angular
  .module('settingsSyncDemo', [])
  .model('settingsModel', () => ({
    theme: 'light',
    compact: false,
  }))
  .model('settingsSyncModel', () => ({
    writes: 0,
  }))
  .controller(
    'SettingsCtrl',
    class {
      static $inject = ['settingsModel', 'settingsSyncModel', '$cookie', '$scope'];

      constructor(settingsModel, syncModel, $cookie, $scope) {
        this.model = settingsModel;
        this.sync = syncModel;
        this.$cookie = $cookie;
        this.stopSync = settingsModel.$sync([
          '$cookie',
          ($cookieService) => ({
            restore: () => $cookieService.getObject('angular_ts_settings') ?? null,
            write: (snapshot) => {
              syncModel.writes += 1;
              $cookieService.putObject('angular_ts_settings', snapshot, {
                path: '/',
              });
            },
          }),
        ]);

        $scope.$on('$destroy', this.stopSync);
      }

      reset() {
        this.$cookie.remove('angular_ts_settings', { path: '/' });
        this.model.$restore({
          theme: 'light',
          compact: false,
        });
      }
    },
  );
