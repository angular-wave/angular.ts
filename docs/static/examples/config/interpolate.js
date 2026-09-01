window.angular
  .createModule("interpolateConfigDemo", [])
  .config({
    $interpolate: {
      startSymbol: "[[",
      endSymbol: "]]",
    },
  })
  .controller(
    "InterpolateConfigCtrl",
    class {
      name = "Ada";
    },
  );
