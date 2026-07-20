window.angular
  .module('sceConfigDemo', [])
  .config({
    $sce: {
      enabled: true,
    },
    $sceDelegate: {
      trustedResourceUrlList: ['self', 'https://cdn.example.com/templates/**'],
      bannedResourceUrlList: ['https://cdn.example.com/templates/private/**'],
      aHrefSanitizationTrustedUrlList: /^\s*(https?|mailto):/,
      imgSrcSanitizationTrustedUrlList:
        /^\s*((https?|file|blob):|data:image\/)/,
    },
  })
  .controller(
    'SceConfigCtrl',
    class {
      static $inject = ['$sce'];

      constructor($sce) {
        this.enabled = $sce.isEnabled();
        this.templateUrl = $sce.getTrustedResourceUrl(
          'https://cdn.example.com/templates/panel.html',
        );
      }
    },
  );
