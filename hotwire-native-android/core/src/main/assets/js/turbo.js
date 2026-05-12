// Reference-only Hotwire/Turbo native adapter. Runtime now uses no-turbo-bridge.js.
(() => {
  const TURBO_LOAD_TIMEOUT = 4000;
  const PENDING_VISIT_KEY = "hotwire-native-fallback-visit";

  // Bridge between Turbo JS and native code. Built for Turbo 7
  // with backwards compatibility for Turbolinks 5
  class TurboNative {
    constructor() {
      this.fallbackVisitIdentifier = 0;
    }

    registerAdapter() {
      if (window.Turbo) {
        Turbo.registerAdapter(this);
        TurboSession.turboIsReady(true);
        if (TurboSession.setTurboEnabled) {
          TurboSession.setTurboEnabled(true);
        }
      } else if (window.Turbolinks) {
        Turbolinks.controller.adapter = this;
        TurboSession.turboIsReady(true);
        if (TurboSession.setTurboEnabled) {
          TurboSession.setTurboEnabled(true);
        }
      } else {
        TurboSession.setTurboEnabled(false);
        TurboSession.turboIsReady(true);
      }
    }

    pageLoaded() {
      let restorationIdentifier = "";

      if (window.Turbo) {
        restorationIdentifier = Turbo.navigator.restorationIdentifier;
      } else if (window.Turbolinks) {
        restorationIdentifier = Turbolinks.controller.restorationIdentifier;
      }

      this.afterNextRepaint(function () {
        TurboSession.pageLoaded(restorationIdentifier);
        window.turboNative.finishPendingNavigation();
      });
    }

    pageLoadFailed() {
      TurboSession.turboFailedToLoad();
    }

    visitLocationWithOptionsAndRestorationIdentifier(
      location,
      optionsJSON,
      restorationIdentifier,
    ) {
      let options = JSON.parse(optionsJSON);
      let action = options.action;
      const normalizedLocation = new URL(
        location,
        window.location.href,
      ).toString();

      if (window.Turbo) {
        if (
          Turbo.navigator.locationWithActionIsSamePage(
            new URL(location),
            action,
          )
        ) {
          // Skip the same-page anchor scrolling behavior for visits initiated from the native
          // side. The page content may be stale and we want a fresh request from the network.
          Turbo.navigator.startVisit(location, restorationIdentifier, {
            action: "replace",
          });
        } else {
          Turbo.navigator.startVisit(location, restorationIdentifier, options);
        }
      } else if (window.Turbolinks) {
        if (Turbolinks.controller.startVisitToLocationWithAction) {
          // Turbolinks 5
          Turbolinks.controller.startVisitToLocationWithAction(
            location,
            action,
            restorationIdentifier,
          );
        } else {
          // Turbolinks 5.3
          Turbolinks.controller.startVisitToLocation(
            location,
            restorationIdentifier,
            options,
          );
        }
      } else {
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
      // A synthetic "restore" visit to the currently rendered location can occur when
      // visiting a web -> native -> back to web screen. In this situation, the connect()
      // callback (from Stimulus) in bridge component controllers will not be called,
      // since they are already connected. We need to notify the web bridge library
      // that the webview has been reattached to manually trigger connect() and notify
      // the native app so the native bridge component view state can be restored.
      document.dispatchEvent(new Event("native:restore"));
    }

    cacheSnapshot() {
      if (window.Turbo) {
        Turbo.session.view.cacheSnapshot();
      }
    }

    // Current visit

    issueRequestForVisitWithIdentifier(identifier) {
      if (identifier == this.currentVisit.identifier) {
        this.currentVisit.issueRequest();
      }
    }

    changeHistoryForVisitWithIdentifier(identifier) {
      if (identifier == this.currentVisit.identifier) {
        this.currentVisit.changeHistory();
      }
    }

    loadCachedSnapshotForVisitWithIdentifier(identifier) {
      if (identifier == this.currentVisit.identifier) {
        this.currentVisit.loadCachedSnapshot();
      }
    }

    loadResponseForVisitWithIdentifier(identifier) {
      if (identifier == this.currentVisit.identifier) {
        this.currentVisit.loadResponse();
      }
    }

    cancelVisitWithIdentifier(identifier) {
      if (identifier == this.currentVisit.identifier) {
        this.currentVisit.cancel();
      }
    }

    visitRenderedForColdBoot(visitIdentifier) {
      this.afterNextRepaint(function () {
        TurboSession.visitRendered(visitIdentifier);
      });
    }

    // Adapter interface

    visitProposedToLocation(location, options) {
      if (
        window.Turbo &&
        Turbo.navigator.locationWithActionIsSamePage(location, options.action)
      ) {
        // Scroll to the anchor on the page
        TurboSession.visitProposalScrollingToAnchor(
          location.toString(),
          JSON.stringify(options),
        );
        Turbo.navigator.view.scrollToAnchorFromLocation(location);
      } else if (
        window.Turbo &&
        Turbo.navigator.location?.href === location.href
      ) {
        // Refresh the page without native proposal
        TurboSession.visitProposalRefreshingPage(
          location.toString(),
          JSON.stringify(options),
        );
        this.visitLocationWithOptionsAndRestorationIdentifier(
          location,
          JSON.stringify(options),
          Turbo.navigator.restorationIdentifier,
        );
      } else {
        // Propose the visit
        TurboSession.visitProposedToLocation(
          location.toString(),
          JSON.stringify(options),
        );
      }
    }

    // Turbolinks 5
    visitProposedToLocationWithAction(location, action) {
      this.visitProposedToLocation(location, { action });
    }

    visitStarted(visit) {
      TurboSession.visitStarted(
        visit.identifier,
        visit.hasCachedSnapshot(),
        visit.isPageRefresh || false,
        visit.location.toString(),
      );
      this.currentVisit = visit;
      this.issueRequestForVisitWithIdentifier(visit.identifier);
      this.changeHistoryForVisitWithIdentifier(visit.identifier);
      this.loadCachedSnapshotForVisitWithIdentifier(visit.identifier);
    }

    visitRequestStarted(visit) {
      TurboSession.visitRequestStarted(visit.identifier);
    }

    visitRequestCompleted(visit) {
      TurboSession.visitRequestCompleted(visit.identifier);
      this.loadResponseForVisitWithIdentifier(visit.identifier);
    }

    visitRequestFailedWithStatusCode(visit, statusCode) {
      const location = visit.location.toString();

      // Non-HTTP status codes are sent by Turbo for network failures, including
      // cross-origin fetch redirect attempts. For non-HTTP status codes, pass to
      // the native side to determine whether a cross-origin redirect visit should
      // be proposed.
      if (statusCode <= 0) {
        TurboSession.visitRequestFailedWithNonHttpStatusCode(
          location,
          visit.identifier,
          visit.hasCachedSnapshot(),
        );
      } else {
        TurboSession.visitRequestFailedWithStatusCode(
          location,
          visit.identifier,
          visit.hasCachedSnapshot(),
          statusCode,
        );
      }
    }

    visitRequestFinished(visit) {
      TurboSession.visitRequestFinished(visit.identifier);
    }

    visitRendered(visit) {
      this.afterNextRepaint(function () {
        TurboSession.visitRendered(visit.identifier);
      });
    }

    visitCompleted(visit) {
      this.afterNextRepaint(function () {
        TurboSession.visitCompleted(
          visit.identifier,
          visit.restorationIdentifier,
        );
      });
    }

    formSubmissionStarted(formSubmission) {
      TurboSession.formSubmissionStarted(formSubmission.location.toString());
    }

    formSubmissionFinished(formSubmission) {
      TurboSession.formSubmissionFinished(formSubmission.location.toString());
    }

    pageInvalidated() {
      TurboSession.pageInvalidated();
    }

    linkPrefetchingIsEnabledForLocation(location) {
      // Disable link prefetching since it can be activated by link taps. We
      // don't want to prefetch links that may correspond to native screens.
      return false;
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

    var element = event.target;

    while (element) {
      const preventPullToRefresh = !!element.closest(
        "[data-native-prevent-pull-to-refresh]",
      );

      if (preventPullToRefresh) {
        TurboSession.elementTouchStarted(true);
        break;
      }

      element = element.parentElement;
    }

    if (!element) {
      TurboSession.elementTouchStarted(false);
    }
  };

  const elementTouchEnd = () => {
    TurboSession.elementTouchEnded();
  };

  // Setup and register adapter

  window.turboNative = new TurboNative();

  const setup = function () {
    window.turboNative.registerAdapter();
    window.turboNative.pageLoaded();

    document.removeEventListener("turbo:load", setup);
    document.removeEventListener("turbolinks:load", setup);

    document.addEventListener("touchstart", elementTouchStart);
    document.addEventListener("touchend", elementTouchEnd);
  };

  const setupOnLoad = () => {
    document.addEventListener("turbo:load", setup);
    document.addEventListener("turbolinks:load", setup);

    if (!window.Turbo && !window.Turbolinks) {
      // Experiment mode: some pages intentionally do not ship with Hotwire.
      // Treat absence of Turbo/Turbolinks as a non-fatal state and initialize
      // the native bridge in non-Turbo mode immediately.
      setup();
    } else {
      setTimeout(() => {
        if (!window.turboNative) return;

        if (!window.Turbo && !window.Turbolinks) {
          setup();
        }
      }, TURBO_LOAD_TIMEOUT);
    }
  };

  if (window.Turbo || window.Turbolinks) {
    setup();
  } else {
    setupOnLoad();
  }
})();
