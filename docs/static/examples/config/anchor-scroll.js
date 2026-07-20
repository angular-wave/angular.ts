window.angular
  .module('anchorScrollConfigDemo', [])
  .config({
    $anchorScroll: {
      autoScrolling: false,
    },
  })
  .controller(
    'AnchorScrollCtrl',
    class {
      static $inject = ['$anchorScroll', '$location'];

      constructor($anchorScroll, $location) {
        this.$anchorScroll = $anchorScroll;
        this.$location = $location;
        this.currentHash = $location.getHash();
      }

      openDetails() {
        this.$location.hash('details');
        this.$anchorScroll('details');
        this.currentHash = this.$location.getHash();
      }
    },
  );
