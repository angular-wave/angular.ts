window.angular
  .module("interpolateConfigDemo", [])
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
