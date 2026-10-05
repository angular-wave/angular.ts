window.angular
  .createModule('sceConfigDemo', [])
  .config({
    $compile: {
      htmlPolicy: (html) => {
        if (html !== '<strong>Approved content</strong>') {
          throw new Error('Unapproved HTML');
        }
        return html;
      },
    },
  })
  .controller(
    'SceConfigCtrl',
    class {
      constructor() {
        this.html = '<strong>Approved content</strong>';
      }
    },
  );
