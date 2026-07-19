angular.module("routeCompletionFixture", [])
  .lazyState("reports.**", () => import("./reports.routes"))
  .state("admin", {
    url: "/admin",
  })
  .state("admin.profile", {
    url: "/profile/{userId:int}?tab",
  });
