window.angular
  .createModule("ariaFormValidationDemo", [])
  .controller(
    "AriaFormValidationCtrl",
    class {
      user = { email: "", password: "" };
    },
  );
