window.angular
  .createModule("ariaConfigDemo", [])
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
