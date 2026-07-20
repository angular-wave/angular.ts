window.reportedErrors = [];

window.angular
  .module('exceptionConfigDemo', [])
  .config({
    $exceptionHandler: {
      handler(error) {
        window.reportedErrors.push(error.message || String(error));
        throw error;
      },
    },
  })
  .controller(
    'ExceptionCtrl',
    class {
      static $inject = ['$exceptionHandler'];

      constructor($exceptionHandler) {
        this.$exceptionHandler = $exceptionHandler;
        this.message = 'No error reported yet.';
      }

      report() {
        try {
          this.$exceptionHandler(new Error('Upload failed'));
        } catch {
          this.message = window.reportedErrors[0];
        }
      }
    },
  );
