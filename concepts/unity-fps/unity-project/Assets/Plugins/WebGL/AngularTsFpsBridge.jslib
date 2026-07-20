mergeInto(LibraryManager.library, {
  AngularTsFpsReady: function () {
    if (window.angularTsUnityFps) {
      window.angularTsUnityFps.ready();
    }
  },

  AngularTsFpsState: function (jsonPtr) {
    if (window.angularTsUnityFps) {
      window.angularTsUnityFps.state(UTF8ToString(jsonPtr));
    }
  },

  AngularTsFpsEvent: function (jsonPtr) {
    if (window.angularTsUnityFps) {
      window.angularTsUnityFps.event(UTF8ToString(jsonPtr));
    }
  },
});
