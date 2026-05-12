(() => {
  const PENDING_VISIT_KEY = "hotwire-native-fallback-visit";

  class TurboNative {
    constructor() {
      this.fallbackVisitIdentifier = 0;
    }

    registerAdapter() {
      if (window.TurboSession) {
        TurboSession.setTurboEnabled(false);
        TurboSession.turboIsReady(true);
      }
    }

    pageLoaded() {
      const restorationIdentifier = "";

      this.afterNextRepaint(function () {
        if (window.TurboSession) {
          TurboSession.pageLoaded(restorationIdentifier);
        }

        window.turboNative.finishPendingNavigation();
      });
    }

    pageLoadFailed() {
      if (window.TurboSession) {
        TurboSession.turboFailedToLoad();
      }
    }

    visitLocationWithOptionsAndRestorationIdentifier(location, optionsJSON) {
      const options = JSON.parse(optionsJSON);
      const action = options.action;
      const normalizedLocation = new URL(
        location,
        window.location.href,
      ).toString();

      if (!window.TurboSession) return;

      const visitIdentifier = this.nextFallbackVisitIdentifier();
      TurboSession.visitStarted(
        visitIdentifier,
        false,
        false,
        normalizedLocation,
      );
      TurboSession.visitRequestStarted(visitIdentifier);
      this.setPendingVisit({
        identifier: visitIdentifier,
        location: normalizedLocation,
      });

      if (action === "replace") {
        window.location.replace(normalizedLocation);
      } else {
        window.location.assign(normalizedLocation);
      }
    }

    finishPendingNavigation() {
      const pendingVisit = this.getPendingVisit();

      if (!pendingVisit) {
        return;
      }

      const isCurrentLocation =
        new URL(window.location.href).toString() === pendingVisit.location;

      if (!isCurrentLocation) {
        return;
      }

      this.clearPendingVisit();
      TurboSession.visitRequestCompleted(pendingVisit.identifier);
      TurboSession.visitRequestFinished(pendingVisit.identifier);

      this.afterNextRepaint(function () {
        TurboSession.visitRendered(pendingVisit.identifier);
        TurboSession.visitCompleted(pendingVisit.identifier, "");
      });
    }

    restoreCurrentVisit() {
      document.dispatchEvent(new Event("native:restore"));
    }

    cacheSnapshot() {}

    visitRenderedForColdBoot(visitIdentifier) {
      this.afterNextRepaint(function () {
        if (window.TurboSession) {
          TurboSession.visitRendered(visitIdentifier);
        }
      });
    }

    getPendingVisit() {
      const value = window.sessionStorage.getItem(PENDING_VISIT_KEY);

      if (!value) {
        return null;
      }

      try {
        const payload = JSON.parse(value);

        if (
          typeof payload.identifier === "string" &&
          typeof payload.location === "string"
        ) {
          return payload;
        }
      } catch (error) {
        this.clearPendingVisit();
      }

      return null;
    }

    setPendingVisit(payload) {
      window.sessionStorage.setItem(PENDING_VISIT_KEY, JSON.stringify(payload));
    }

    clearPendingVisit() {
      window.sessionStorage.removeItem(PENDING_VISIT_KEY);
    }

    nextFallbackVisitIdentifier() {
      this.fallbackVisitIdentifier += 1;
      return `fallback-${this.fallbackVisitIdentifier}`;
    }

    // Private

    afterNextRepaint(callback) {
      if (document.hidden) {
        callback();
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(callback);
        });
      }
    }
  }

  // Touch detection for elements marked to opt out of pull-to-refresh.

  const elementTouchStart = (event) => {
    if (!event.target) return;

    let element = event.target;

    while (element) {
      const preventPullToRefresh = !!element.closest(
        "[data-native-prevent-pull-to-refresh]",
      );

      if (preventPullToRefresh) {
        if (window.TurboSession) {
          TurboSession.elementTouchStarted(true);
        }
        break;
      }

      element = element.parentElement;
    }
  };

  const elementTouchEnd = () => {
    if (window.TurboSession) {
      TurboSession.elementTouchEnded();
    }
  };

  if (window.turboNative == null) {
    window.turboNative = new TurboNative();
    window.turboNative.registerAdapter();
    window.turboNative.pageLoaded();
  }

  document.addEventListener("touchstart", elementTouchStart);
  document.addEventListener("touchend", elementTouchEnd);
})();
