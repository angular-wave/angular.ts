const configuredTemplateCache = new Map([
  ['cached.html', '<p>Configured template cache</p>'],
]);

window.angular
  .module('templateCacheConfigDemo', [])
  .config({
    $templateCache: {
      cache: configuredTemplateCache,
    },
  })
  .controller(
    'TemplateCacheConfigCtrl',
    class {
      static $inject = ['$templateCache'];

      constructor($templateCache) {
        this.template = $templateCache.get('cached.html');
      }
    },
  );
