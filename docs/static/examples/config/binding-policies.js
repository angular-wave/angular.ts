window.angular
  .createModule('bindingPoliciesConfigDemo', [])
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
    'BindingPoliciesConfigCtrl',
    class {
      constructor() {
        this.html = '<strong>Approved content</strong>';
      }
    },
  );
