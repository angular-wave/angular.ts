window.angular
  .createModule('templateRequestConfigDemo', [])
  .config({
    $templateRequest: {
      httpOptions: {
        headers: {
          'X-Template': 'configured',
        },
        credentials: 'include',
      },
    },
  })
  .controller(
    'TemplateRequestConfigCtrl',
    class {
      static $inject = ['$templateRequest'];

      constructor($templateRequest) {
        this.template = 'Loading...';
        $templateRequest('./template-request-fragment.html').then(
          (template) => {
            this.template = template;
          },
        );
      }
    },
  );
