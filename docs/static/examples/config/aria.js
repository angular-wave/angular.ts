window.angular
  .module("ariaConfigDemo", [])
  .config({
    $aria: {
      ariaDisabled: false,
      bindKeydown: false,
    },
  })
  .controller(
    "AriaConfigCtrl",
    class {
      disabled = true;
    },
  );
