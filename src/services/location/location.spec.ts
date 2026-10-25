// @ts-nocheck
/// <reference types="jasmine" />
import {
  decodePath,
  encodePath,
  isLinkRewritingEnabled,
  normalizePath,
  Location,
  applyLocationConfiguration,
  createLocationRuntimeState,
  parseAppUrl,
  stripBaseUrl,
  stripHash,
  stripFile,
  serverBase,
  urlsEqual,
} from "./location.ts";
import { Angular } from "../../angular.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";

describe("$location", () => {
  let module;

  beforeEach(() => {
    window.angular = new Angular();
    module = window.angular.createModule("test1", ["ng"]);
  });

  describe("defaults", () => {
    it('should have hashPrefix of "!"', () => {
      const state = createLocationRuntimeState(window);

      expect(state.config.hashPrefix).toBe("!");
    });

    it("should default to html5 mode with no base and rewrite links", () => {
      const state = createLocationRuntimeState(window);

      expect(state.config.html5Mode.enabled).toBeTrue();
      expect(state.config.html5Mode.requireBase).toBeFalse();
      expect(state.config.html5Mode.rewriteLinks).toBeTrue();
    });

    it("should enable default rewriteLinks", () => {
      const state = createLocationRuntimeState(window);

      expect(isLinkRewritingEnabled(state.config.html5Mode.rewriteLinks)).toBe(
        true,
      );
    });

    it("should allow disabling rewriteLinks", () => {
      const state = createLocationRuntimeState(window);

      applyLocationConfiguration(state, {
        html5Mode: { rewriteLinks: false },
      });

      expect(isLinkRewritingEnabled(state.config.html5Mode.rewriteLinks)).toBe(
        false,
      );
    });

    it("should allow explicitly forcing rewriteLinks on", () => {
      const state = createLocationRuntimeState(window);

      applyLocationConfiguration(state, {
        html5Mode: { rewriteLinks: true },
      });

      expect(isLinkRewritingEnabled(state.config.html5Mode.rewriteLinks)).toBe(
        true,
      );
    });

    it("rejects configuration after runtime disposal", () => {
      const state = createLocationRuntimeState(window);

      state.destroy();

      expect(() =>
        applyLocationConfiguration(state, { hashPrefix: "~" }),
      ).toThrowError("Location runtime has already been disposed.");
    });

    it("owns and disposes browser URL listeners", () => {
      const state = createLocationRuntimeState(window);
      const addEventListener = spyOn(
        window,
        "addEventListener",
      ).and.callThrough();
      const removeEventListener = spyOn(
        window,
        "removeEventListener",
      ).and.callThrough();

      state._onUrlChange(() => undefined);
      state.destroy();
      state.destroy();

      expect(addEventListener).toHaveBeenCalledWith(
        "popstate",
        jasmine.any(Function),
      );
      expect(addEventListener).toHaveBeenCalledWith(
        "hashchange",
        jasmine.any(Function),
      );
      expect(removeEventListener).toHaveBeenCalledWith(
        "popstate",
        jasmine.any(Function),
      );
      expect(removeEventListener).toHaveBeenCalledWith(
        "hashchange",
        jasmine.any(Function),
      );
      expect(() => state._onUrlChange(() => undefined)).toThrowError(
        "Location runtime has already been disposed.",
      );
    });
  });

  describe("browser runtime", () => {
    const runtimes = [];

    afterEach(() => {
      runtimes.splice(0).forEach((runtime) => runtime.destroy());
    });

    function createHarness(config = {}, initial = {}) {
      const windowListeners = {};
      const scopeListeners = {};
      const broadcasts = [];
      const exceptions = [];
      const fakeLocation = { href: initial.url ?? "http://localhost/" };
      const fakeHistory = {
        state: initial.state ?? null,
        pushState(state, _title, url) {
          this.state = structuredClone(state);
          fakeLocation.href = String(url);
        },
        replaceState(state, _title, url) {
          this.state = structuredClone(state);
          fakeLocation.href = String(url);
        },
      };
      const fakeWindow = {
        document: {
          get baseURI() {
            return initial.base ?? fakeLocation.href;
          },
        },
        location: fakeLocation,
        history: fakeHistory,
        addEventListener(name, listener) {
          windowListeners[name] = listener;
        },
        removeEventListener(name, listener) {
          if (windowListeners[name] === listener) delete windowListeners[name];
        },
      };
      let onBroadcast;
      const rootScope = {
        on(name, listener) {
          scopeListeners[name] = listener;

          return () => delete scopeListeners[name];
        },
        broadcast(name, ...args) {
          const event = {
            defaultPrevented: false,
            preventDefault() {
              this.defaultPrevented = true;
            },
          };

          broadcasts.push([name, ...args]);
          onBroadcast?.(name, event, ...args);

          return event;
        },
      };
      const rootElement = document.createElement("div");
      const runtime = createLocationRuntimeState(fakeWindow);

      runtimes.push(runtime);
      applyLocationConfiguration(runtime, config);

      const location = runtime.createService(rootScope, rootElement, (error) =>
        exceptions.push(error),
      );

      return {
        broadcasts,
        exceptions,
        fakeHistory,
        fakeLocation,
        location,
        rootElement,
        runtime,
        scopeListeners,
        setBroadcastHandler(handler) {
          onBroadcast = handler;
        },
        windowListeners,
      };
    }

    it("initializes history state from the browser", () => {
      const harness = createHarness({}, { state: { page: 1 } });

      expect(harness.location.getState()).toBe(harness.fakeHistory.state);
      expect(harness.location.getState()).toEqual({ page: 1 });
    });

    it("synchronizes browser history state without a URL change", async () => {
      const harness = createHarness();

      await wait();
      harness.fakeHistory.state = { page: 2 };
      harness.windowListeners.popstate();

      expect(harness.location.getState()).toBeNull();
      await wait();
      expect(harness.location.getState()).toBe(harness.fakeHistory.state);
      expect(harness.location.getState()).toEqual({ page: 2 });
      expect(harness.location.getPath()).toBe("/");
    });

    it("commits state changes when the runtime synchronizes an unchanged URL", async () => {
      const harness = createHarness();

      await wait();
      const state = { page: 2 };

      harness.location.setState(state);
      await waitUntil(() => harness.fakeHistory.state?.page === 2);

      expect(harness.fakeLocation.href).toBe("http://localhost/");
      expect(harness.location.getState()).toBe(harness.fakeHistory.state);
      state.page = 3;
      expect(harness.location.getState()).toEqual({ page: 2 });
    });

    it("commits the most recent URL and state and clears state on later URL writes", async () => {
      const harness = createHarness();

      await wait();
      harness.location.setPath("/first").setState({ page: 1 });
      harness.location.setPath("/second").setState({ page: 2 });
      await waitUntil(() => harness.fakeLocation.href.endsWith("/second"));

      expect(harness.fakeHistory.state).toEqual({ page: 2 });
      expect(harness.location.getState()).toBe(harness.fakeHistory.state);

      harness.location.setPath("/third");
      await waitUntil(() => harness.fakeLocation.href.endsWith("/third"));
      expect(harness.fakeHistory.state).toBeNull();
      expect(harness.location.getState()).toBeNull();
    });

    it("coalesces chained writes into one history entry and event pair", async () => {
      const harness = createHarness();
      await wait();
      const push = spyOn(harness.fakeHistory, "pushState").and.callThrough();
      harness.broadcasts.length = 0;
      harness.location
        .setPath("/first")
        .setSearch({ flag: true, tag: ["a", "b"] })
        .setHash("section");
      harness.location.setPath("/final").setState({ page: 2 });
      harness.scopeListeners.$updateBrowser();
      expect(push).not.toHaveBeenCalled();
      await wait();
      expect(push.calls.count()).toBe(1);
      expect(harness.fakeLocation.href).toBe(
        "http://localhost/final?flag&tag=a&tag=b#section",
      );
      expect(harness.broadcasts.map(([name]) => name)).toEqual([
        "$locationChangeStart",
        "$locationChangeSuccess",
      ]);
      harness.scopeListeners.$updateBrowser();
      await wait();
      expect(push.calls.count()).toBe(1);
      expect(harness.broadcasts.length).toBe(2);
    });

    it("normalizes an initial hashbang using replacement while preserving browser state", async () => {
      const harness = createHarness(
        {},
        { url: "http://localhost/#!/route", state: { page: 1 } },
      );
      const push = spyOn(harness.fakeHistory, "pushState").and.callThrough();
      expect(harness.fakeLocation.href).toBe("http://localhost/route");
      expect(harness.fakeHistory.state).toEqual({ page: 1 });
      expect(harness.location.getState()).toBe(harness.fakeHistory.state);
      await wait();
      expect(push).not.toHaveBeenCalled();
    });

    it("deduplicates writes and supports relative runtime URLs", async () => {
      const harness = createHarness();
      await wait();
      const push = spyOn(harness.fakeHistory, "pushState").and.callThrough();
      expect(harness.runtime.setUrl(undefined)).toBe(harness.runtime);
      harness.runtime.setUrl("/relative");
      harness.runtime.setUrl("http://localhost/relative#");
      harness.windowListeners.popstate();
      await wait();
      expect(push.calls.count()).toBe(1);
      expect(harness.location.getPath()).toBe("/");
      expect(harness.fakeLocation.href).toBe("http://localhost/relative");
    });

    it("keeps equivalent browser state references stable across duplicate native events", async () => {
      const harness = createHarness({}, { state: { page: 1 } });
      await wait();
      const state = harness.location.getState();
      harness.broadcasts.length = 0;
      harness.fakeHistory.state = { page: 1 };
      harness.windowListeners.popstate();
      harness.windowListeners.hashchange();
      await wait();
      expect(harness.location.getState()).toBe(state);
      expect(harness.broadcasts).toEqual([]);
    });

    it("does not write history when only an empty fragment is cleared", async () => {
      const harness = createHarness({}, { url: "http://localhost/#" });
      const pushState = spyOn(
        harness.fakeHistory,
        "pushState",
      ).and.callThrough();

      await wait();
      harness.location.setHash("");
      await wait();
      await wait();

      expect(pushState).not.toHaveBeenCalled();
      expect(harness.location.absUrl).toBe("http://localhost/");
    });

    [true, false].forEach((html5Mode) => {
      const mode = html5Mode ? "HTML5" : "hash";
      const appUrl = (path) =>
        html5Mode ? `http://localhost${path}` : `http://localhost/#!${path}`;

      it(`synchronizes paths, quoted queries, and fragments in ${mode} mode`, async () => {
        const harness = createHarness({ html5Mode });

        await wait();
        harness.location
          .setPath("/a;b")
          .setSearch({ q: "'" })
          .setHash("section");
        await waitUntil(
          () =>
            harness.fakeLocation.href ===
            appUrl(html5Mode ? "/a;b?q=%27#section" : "/a;b?q='#section"),
        );

        harness.fakeLocation.href = appUrl("/next?q=%27#other");
        harness.windowListeners[html5Mode ? "popstate" : "hashchange"]();
        expect(harness.location.getPath()).toBe("/a;b");
        await waitUntil(() => harness.location.getPath() === "/next");
        expect(harness.location.getSearch()).toEqual({ q: "'" });
        expect(harness.location.getHash()).toBe("other");
        expect(harness.exceptions).toEqual([]);
      });

      it(`allows a success listener to navigate again in ${mode} mode`, async () => {
        const harness = createHarness({ html5Mode });

        await wait();
        harness.setBroadcastHandler((name) => {
          if (
            name === "$locationChangeSuccess" &&
            harness.location.getPath() === "/first"
          ) {
            harness.location.setPath("/second");
          }
        });
        harness.location.setPath("/first");
        await waitUntil(() => harness.fakeLocation.href === appUrl("/second"));

        const pushState = spyOn(
          harness.fakeHistory,
          "pushState",
        ).and.callThrough();

        await wait(10);
        expect(pushState).not.toHaveBeenCalled();
        expect(harness.exceptions).toEqual([]);
      });

      ["application", "browser"].forEach((source) => {
        it(`exposes the target path and honors cancellation for ${source} navigation in ${mode} mode`, async () => {
          const harness = createHarness({ html5Mode });

          await wait();
          const initialPath = harness.location.getPath();
          const initialUrl = harness.fakeLocation.href;

          harness.broadcasts.length = 0;
          harness.setBroadcastHandler((name, event, newUrl, oldUrl) => {
            if (name !== "$locationChangeStart") return;
            expect(newUrl).toBe(appUrl("/blocked"));
            expect(harness.location.getPath()).toBe("/blocked");
            expect(oldUrl).toBe(initialUrl);
            event.preventDefault();
          });
          if (source === "application") {
            harness.location.setPath("/blocked");
          } else {
            harness.fakeLocation.href = appUrl("/blocked");
            harness.windowListeners[html5Mode ? "popstate" : "hashchange"]();
          }
          await wait();
          await wait();
          await wait();

          expect(harness.location.getPath()).toBe(initialPath);
          expect(harness.fakeLocation.href).toBe(initialUrl);
          expect(harness.broadcasts.map(([name]) => name)).toEqual([
            "$locationChangeStart",
          ]);
        });

        it(`uses the final redirect even when ${source} navigation is cancelled in ${mode} mode`, async () => {
          const harness = createHarness({ html5Mode });

          await wait();
          harness.setBroadcastHandler((name, event) => {
            if (
              name === "$locationChangeStart" &&
              harness.location.getPath() === "/incoming"
            ) {
              event.preventDefault();
              harness.location.setPath("/first-redirect");
              harness.location.setPath("/final-redirect");
            }
          });
          if (source === "application") {
            harness.location.setPath("/incoming");
          } else {
            harness.fakeLocation.href = appUrl("/incoming");
            harness.windowListeners[html5Mode ? "popstate" : "hashchange"]();
          }
          await waitUntil(
            () => harness.fakeLocation.href === appUrl("/final-redirect"),
          );

          expect(harness.location.getPath()).toBe("/final-redirect");
          expect(harness.exceptions).toEqual([]);
        });
      });
    });

    it("synchronizes hash routing with an empty prefix", async () => {
      const harness = createHarness({ html5Mode: false, hashPrefix: "" });

      await wait();
      harness.location.setPath("/route").setHash("section");
      await waitUntil(
        () => harness.fakeLocation.href === "http://localhost/#/route#section",
      );
      expect(harness.location.getHash()).toBe("section");
      expect(harness.exceptions).toEqual([]);
    });

    it("leaves browser-owned links and modified clicks alone", () => {
      const harness = createHarness();
      const cases = [
        { href: "http://localhost/next", target: "_blank" },
        { href: "http://localhost/next", target: "frame" },
        { href: "https://example.com/next" },
        { href: "mailto:user@example.com" },
        { href: null },
        { href: "http://localhost/next", ctrlKey: true },
        { href: "http://localhost/next", metaKey: true },
        { href: "http://localhost/next", shiftKey: true },
        { href: "http://localhost/next", altKey: true },
        { href: "http://localhost/next", button: 1 },
        { href: "http://localhost/next", button: 2 },
        { href: "http://localhost/next", defaultPrevented: true },
      ];

      for (const { href, target, ...overrides } of cases) {
        const link = document.createElement("a");

        if (href !== null) link.href = href;
        if (target) link.target = target;
        harness.rootElement.append(link);
        const event = {
          target: link,
          button: 0,
          preventDefault: jasmine.createSpy("preventDefault"),
          ...overrides,
        };

        harness.runtime._rootClickHandler(event);
        expect(event.preventDefault)
          .withContext(JSON.stringify({ href, target, ...overrides }))
          .not.toHaveBeenCalled();
        expect(harness.location.getPath()).toBe("/");
      }
    });

    it("rewrites nested link clicks and fragment-only links", () => {
      const harness = createHarness();
      const link = document.createElement("a");
      const span = document.createElement("span");

      link.href = "http://localhost/next?q=1#old";
      link.append(span);
      harness.rootElement.append(link);
      const event = {
        target: span,
        button: 0,
        preventDefault: jasmine.createSpy("preventDefault"),
      };

      harness.runtime._rootClickHandler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(harness.location.getPath()).toBe("/next");

      link.setAttribute("href", "#new");
      harness.runtime._rootClickHandler(event);
      expect(harness.location.getUrl()).toBe("/next?q=1#new");
    });

    it("does not rewrite application links when disabled", () => {
      const harness = createHarness({ html5Mode: { rewriteLinks: false } });
      const link = document.createElement("a");

      link.href = "http://localhost/next";
      harness.rootElement.append(link);
      const event = {
        target: link,
        button: 0,
        preventDefault: jasmine.createSpy("preventDefault"),
      };

      harness.runtime._rootClickHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(harness.location.getPath()).toBe("/");
    });

    it("requires a base element when configured", () => {
      const runtime = createLocationRuntimeState({
        location: { href: "http://localhost/" },
        history: { state: null },
      });

      applyLocationConfiguration(runtime, {
        html5Mode: { requireBase: true },
      });

      expect(() =>
        runtime.createService(
          { on() {}, broadcast() {} },
          document.createElement("div"),
          () => undefined,
        ),
      ).toThrowError(/requires a <base> tag/);
    });

    it("rolls location state back when history updates fail", async () => {
      const harness = createHarness();

      await wait();
      harness.fakeHistory.pushState = () => {
        throw new Error("history failed");
      };

      harness.location.setPath("/next");
      await wait();
      await wait();

      expect(harness.location.getPath()).toBe("/");
      expect(harness.exceptions[0]).toEqual(jasmine.any(Error));
    });

    it("retries failed history writes without reporting navigation success", async () => {
      const harness = createHarness({}, { state: { page: 1 } });
      await wait();
      const originalPush = harness.fakeHistory.pushState;
      const push = spyOn(harness.fakeHistory, "pushState").and.throwError(
        "history failed",
      );
      harness.broadcasts.length = 0;
      harness.location.setPath("/retry").setState({ page: 2 });
      await wait();
      expect(harness.location.getPath()).toBe("/");
      expect(harness.location.getState()).toEqual({ page: 1 });
      expect(harness.broadcasts.map(([name]) => name)).toEqual([
        "$locationChangeStart",
      ]);
      push.and.callFake(originalPush);
      harness.location.setPath("/retry").setState({ page: 2 });
      await wait();
      expect(harness.fakeLocation.href).toBe("http://localhost/retry");
      expect(harness.location.getState()).toEqual({ page: 2 });
      expect(
        harness.broadcasts.filter(([name]) => name === "$locationChangeSuccess")
          .length,
      ).toBe(1);
    });

    it("leaves download links to the browser", () => {
      const harness = createHarness();
      const link = document.createElement("a");
      link.href = "http://localhost/download";
      link.setAttribute("download", "");
      harness.rootElement.append(link);
      const event = {
        target: link,
        button: 0,
        preventDefault: jasmine.createSpy("preventDefault"),
      };
      harness.runtime._rootClickHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(harness.location.getPath()).toBe("/");
    });

    it("rewrites only eligible application links", () => {
      const harness = createHarness({
        html5Mode: { rewriteLinks: "data-internal" },
      });
      const ignored = document.createElement("a");
      const accepted = document.createElement("a");

      ignored.href = "http://localhost/ignored";
      accepted.href = "http://localhost/accepted";
      accepted.setAttribute("data-internal", "");
      harness.rootElement.append(ignored, accepted);

      const eventFor = (target, overrides = {}) => ({
        button: 0,
        ctrlKey: false,
        defaultPrevented: false,
        metaKey: false,
        preventDefault: jasmine.createSpy("preventDefault"),
        shiftKey: false,
        target,
        ...overrides,
      });
      const ignoredEvent = eventFor(ignored);
      const modifiedEvent = eventFor(accepted, { ctrlKey: true });
      const acceptedEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });

      harness.runtime._rootClickHandler(ignoredEvent);
      harness.runtime._rootClickHandler(modifiedEvent);
      accepted.dispatchEvent(acceptedEvent);

      expect(ignoredEvent.preventDefault).not.toHaveBeenCalled();
      expect(modifiedEvent.preventDefault).not.toHaveBeenCalled();
      expect(acceptedEvent.defaultPrevented).toBeTrue();
      expect(harness.location.getPath()).toBe("/accepted");
    });

    it("ignores non-link and unsafe link clicks", () => {
      const harness = createHarness();
      const span = document.createElement("span");
      const unsafe = document.createElement("a");

      unsafe.href = "javascript:void(0)";
      harness.rootElement.append(span, unsafe);

      const spanEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      const unsafeEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });

      span.dispatchEvent(spanEvent);
      unsafe.dispatchEvent(unsafeEvent);

      expect(spanEvent.defaultPrevented).toBeFalse();
      expect(unsafeEvent.defaultPrevented).toBeFalse();
    });

    it("normalizes SVG animated link hrefs", () => {
      const harness = createHarness();
      const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
      link.setAttribute("href", "/vector");
      harness.rootElement.append(link);
      const event = {
        button: 0,
        preventDefault() {
          this.defaultPrevented = true;
        },
        target: link,
      };

      harness.runtime._rootClickHandler(event);

      expect(event.defaultPrevented).toBeTrue();
      expect(harness.location.getPath()).toBe("/vector");
    });

    it("resolves relative SVG links against the document base URL", () => {
      const harness = createHarness({}, { base: "http://localhost/base/" });
      const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
      link.setAttribute("href", "vector");
      harness.rootElement.append(link);
      const event = {
        button: 0,
        target: link,
        preventDefault: jasmine.createSpy("preventDefault"),
      };
      harness.runtime._rootClickHandler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(harness.location.getPath()).toBe("/base/vector");
    });

    it("cancels and redirects incoming browser navigation", async () => {
      const harness = createHarness();

      await wait();
      harness.setBroadcastHandler((name, event) => {
        if (name === "$locationChangeStart") event.preventDefault();
      });
      harness.fakeLocation.href = "http://localhost/cancelled";
      harness.windowListeners.popstate();
      await wait();

      expect(harness.location.getPath()).toBe("/");
      expect(harness.fakeLocation.href).toBe("http://localhost/");

      harness.setBroadcastHandler((name) => {
        if (name === "$locationChangeStart") {
          harness.location.setPath("/redirected");
        }
      });
      harness.fakeLocation.href = "http://localhost/incoming";
      harness.windowListeners.popstate();
      await wait();

      expect(harness.location.getPath()).toBe("/redirected");
    });

    it("cancels and redirects application-driven navigation", async () => {
      const harness = createHarness();

      await wait();
      harness.setBroadcastHandler((name, event) => {
        if (name === "$locationChangeStart") event.preventDefault();
      });
      harness.location.setPath("/cancelled");
      await wait();
      await wait();

      expect(harness.location.getPath()).toBe("/");

      harness.setBroadcastHandler((name) => {
        if (name === "$locationChangeStart") {
          harness.location.setPath("/redirected");
        }
      });
      harness.location.setPath("/incoming");
      await wait();
      await wait();

      expect(harness.location.getPath()).toBe("/redirected");
    });

    it("stops queued navigation work after root destruction", async () => {
      const harness = createHarness();

      harness.fakeLocation.href = "http://localhost/queued";
      harness.windowListeners.popstate();
      harness.scopeListeners["$destroy"]();
      await wait();

      expect(harness.location.getPath()).toBe("/");
      expect(harness.windowListeners.popstate).toBeUndefined();
    });

    it("disconnects root listeners and cancels pending history writes on destruction", async () => {
      const harness = createHarness();
      await wait();
      const flush = harness.scopeListeners.$updateBrowser;
      const destroy = harness.scopeListeners.$destroy;
      const push = spyOn(harness.fakeHistory, "pushState").and.callThrough();
      harness.location.setPath("/queued");
      destroy();
      destroy();
      flush();
      harness.location.setPath("/after-destroy");
      await wait();
      expect(push).not.toHaveBeenCalled();
      expect(harness.scopeListeners.$updateBrowser).toBeUndefined();
      expect(harness.scopeListeners.$destroy).toBeUndefined();
      expect(harness.windowListeners.popstate).toBeUndefined();
      expect(harness.windowListeners.hashchange).toBeUndefined();
    });

    it("replaces a service on another root without keeping the old service alive", async () => {
      const harness = createHarness();
      await wait();
      const oldDestroy = harness.scopeListeners.$destroy;
      const root = document.createElement("div");
      const listeners = {};
      const scope = {
        on(name, callback) {
          listeners[name] = callback;
          return () => delete listeners[name];
        },
        broadcast() {
          return { defaultPrevented: false };
        },
      };
      const replacement = harness.runtime.createService(scope, root, () => {});
      const link = document.createElement("a");
      link.href = "http://localhost/replacement";
      root.append(link);
      oldDestroy();
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      link.dispatchEvent(event);
      await wait();
      expect(event.defaultPrevented).toBeTrue();
      expect(replacement.getPath()).toBe("/replacement");
      expect(harness.fakeLocation.href).toBe("http://localhost/replacement");
      expect(harness.location.getPath()).toBe("/");
      expect(harness.location._updateBrowser).toBeUndefined();
      expect(harness.scopeListeners).toEqual({});
    });

    it("does not commit browser navigation when its start listener destroys the root", async () => {
      const harness = createHarness();
      await wait();
      harness.broadcasts.length = 0;
      harness.setBroadcastHandler((name, event) => {
        if (name === "$locationChangeStart") {
          event.preventDefault();
          harness.scopeListeners.$destroy();
        }
      });
      harness.fakeLocation.href = "http://localhost/destroyed";
      harness.windowListeners.popstate();
      await wait();
      expect(harness.fakeLocation.href).toBe("http://localhost/destroyed");
      expect(harness.broadcasts.map(([name]) => name)).toEqual([
        "$locationChangeStart",
      ]);
    });

    it("sends browser navigation outside the application to the platform", async () => {
      const harness = createHarness();

      await wait();
      harness.fakeLocation.href = "https://example.com/outside";
      harness.windowListeners.popstate();

      expect(harness.fakeLocation.href).toBe("https://example.com/outside");
      expect(harness.location.getPath()).toBe("/");
    });

    it("stops success notification when start listeners destroy the root", async () => {
      const harness = createHarness();

      await wait();
      harness.broadcasts.length = 0;
      harness.setBroadcastHandler((name) => {
        if (name === "$locationChangeStart") {
          harness.scopeListeners["$destroy"]();
        }
      });
      harness.location.setPath("/destroyed");
      await wait();
      await wait();

      expect(
        harness.broadcasts.some(([name]) => name === "$locationChangeSuccess"),
      ).toBeFalse();
    });
  });

  describe("File Protocol", () => {
    it("should not include the drive name in path() on WIN", () => {
      // See issue #4680 for details
      const locationUrl = new Location("file:///base", "file:///", false, "#!");

      locationUrl.parse("file:///base#!/foo?a=b&c#hash");

      expect(locationUrl.getPath()).toBe("/foo");
    });

    it("should include the drive name if it was provided in the input url", () => {
      const locationUrl = new Location("file:///base", "file:///", false, "#!");

      locationUrl.parse("file:///base#!/C:/foo?a=b&c#hash");

      expect(locationUrl.getPath()).toBe("/C:/foo");
    });
  });

  describe("NewUrl", () => {
    function createLocationHtml5Url() {
      const locationUrl = new Location(
        "http://www.domain.com:9877/",
        "http://www.domain.com:9877/",
        true,
      );

      locationUrl.parse(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#hash",
      );

      return locationUrl;
    }

    it("keeps mutable URL state isolated between instances", () => {
      const first = createLocationHtml5Url();
      const second = new Location("http://server/", "http://server/", true);

      second.setUrl("/second?owner=second#two");

      expect(first.getUrl()).toBe("/path/b?search=a&b=c&d#hash");
      expect(first.getPath()).toBe("/path/b");
      expect(first.getSearch()).toEqual({ search: "a", b: "c", d: true });
      expect(first.getHash()).toBe("hash");
      expect(second.getUrl()).toBe("/second?owner=second#two");
    });

    it("should provide common getters", () => {
      const locationUrl = createLocationHtml5Url();

      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#hash",
      );
      expect(locationUrl.getPath()).toBe("/path/b");
      expect(locationUrl.getSearch()).toEqual({ search: "a", b: "c", d: true });
      expect(locationUrl.getHash()).toBe("hash");
      expect(locationUrl.getUrl()).toBe("/path/b?search=a&b=c&d#hash");
    });

    it("setUrl() updates and validates the current URL", () => {
      const locationUrl = createLocationHtml5Url();

      expect(locationUrl.getUrl()).toBe("/path/b?search=a&b=c&d#hash");
      expect(locationUrl.setUrl("/next?value=1#updated")).toBe(locationUrl);
      expect(locationUrl.getUrl()).toBe("/next?value=1#updated");
      expect(() =>
        (locationUrl.setUrl as (url: undefined) => Location)(undefined),
      ).toThrowError(/url/);
    });

    it("clears a hash with null", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setHash(null);

      expect(locationUrl.getHash()).toBe("");
    });

    it("rejects undefined path and hash values passed to explicit setters", () => {
      const locationUrl = createLocationHtml5Url();

      expect(() => locationUrl.setPath(undefined)).toThrowError(/path/);
      expect(() => locationUrl.setHash(undefined)).toThrowError(/hash/);
    });

    it("path() should change path", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setPath("/new/path");
      expect(locationUrl.getPath()).toBe("/new/path");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/new/path?search=a&b=c&d#hash",
      );
    });

    it("path() should not break on numeric values", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setPath(1);
      expect(locationUrl.getPath()).toBe("/1");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/1?search=a&b=c&d#hash",
      );
    });

    it("path() should allow using 0 as path", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setPath(0);
      expect(locationUrl.getPath()).toBe("/0");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/0?search=a&b=c&d#hash",
      );
    });

    it("search() should accept string", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch("x=y&c");
      expect(locationUrl.getSearch()).toEqual({ x: "y", c: true });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?x=y&c#hash",
      );
    });

    it("search() should accept object", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch({ one: 1, two: true });
      expect(locationUrl.getSearch()).toEqual({ one: 1, two: true });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?one=1&two#hash",
      );
    });

    it("search() should copy object", () => {
      const locationUrl = createLocationHtml5Url();

      const obj = { one: 1, two: true, three: null };

      locationUrl.setSearch(obj);
      expect(obj).toEqual({ one: 1, two: true, three: null });
      obj.one = "changed";
      expect(locationUrl.getSearch()).toEqual({ one: 1, two: true });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?one=1&two#hash",
      );
    });

    it("search() should change single parameter", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch({ id: "old", preserved: true });
      locationUrl.setSearchParam("id", "new");

      expect(locationUrl.getSearch()).toEqual({ id: "new", preserved: true });
    });

    it("search() should remove single parameter", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch({ id: "old", preserved: true });
      locationUrl.setSearchParam("id", null);

      expect(locationUrl.getSearch()).toEqual({ preserved: true });
    });

    it("search() should remove multiple parameters", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch({ one: 1, two: true });
      expect(locationUrl.getSearch()).toEqual({ one: 1, two: true });
      locationUrl.setSearch({ one: null, two: null });
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.absUrl).toBe("http://www.domain.com:9877/path/b#hash");
    });

    it("search() should accept numeric keys", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch({ 1: "one", 2: "two" });
      expect(locationUrl.getSearch()).toEqual({ 1: "one", 2: "two" });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?1=one&2=two#hash",
      );
    });

    it("search() should handle multiple value", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch("a&b");
      expect(locationUrl.getSearch()).toEqual({ a: true, b: true });

      locationUrl.setSearchParam("a", null);

      expect(locationUrl.getSearch()).toEqual({ b: true });

      locationUrl.setSearchParam("b", undefined);
      expect(locationUrl.getSearch()).toEqual({});
    });

    it("search() should handle single value", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setSearch("ignore");
      expect(locationUrl.getSearch()).toEqual({ ignore: true });
      locationUrl.setSearch(1);
      expect(locationUrl.getSearch()).toEqual({ 1: true });
    });

    it("search() should throw error an incorrect argument", () => {
      const locationUrl = createLocationHtml5Url();

      expect(() => {
        locationUrl.setSearch(null);
      }).toThrowError(/badarg/);
      expect(() => {
        locationUrl.setSearch(undefined);
      }).toThrowError(/badarg/);
      expect(() => {
        locationUrl.setSearch(true as unknown as string);
      }).toThrowError(/isrcharg/);
    });

    it("hash() should change hash fragment", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setHash("new-hash");
      expect(locationUrl.getHash()).toBe("new-hash");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#new-hash",
      );
    });

    it("hash() should accept numeric parameter", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setHash(5);
      expect(locationUrl.getHash()).toBe("5");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#5",
      );
    });

    it("hash() should allow using 0", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setHash(0);
      expect(locationUrl.getHash()).toBe("0");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#0",
      );
    });

    it("hash() should accept empty string to reset hash", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setHash("");
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d",
      );
    });

    it("setUrl should change the path, search and hash", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setUrl("/some/path?a=b&c=d#hhh");
      expect(locationUrl.getUrl()).toBe("/some/path?a=b&c=d#hhh");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/some/path?a=b&c=d#hhh",
      );
      expect(locationUrl.getPath()).toBe("/some/path");
      expect(locationUrl.getSearch()).toEqual({ a: "b", c: "d" });
      expect(locationUrl.getHash()).toBe("hhh");
    });

    it("setUrl should change only hash when no search and path specified", () => {
      const locationUrl = createLocationHtml5Url();

      expect(locationUrl.getUrl()).toBe("/path/b?search=a&b=c&d#hash");
      locationUrl.setUrl("#some-hash");

      expect(locationUrl.getHash()).toBe("some-hash");
      expect(locationUrl.getUrl()).toBe("/path/b?search=a&b=c&d#some-hash");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#some-hash",
      );
    });

    it("setUrl() should change only search and hash when no path specified", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setUrl("?a=b");

      expect(locationUrl.getSearch()).toEqual({ a: "b" });
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.getPath()).toBe("/path/b");
    });

    it("setUrl() should reset search and hash when only path specified", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setUrl("/new/path");

      expect(locationUrl.getPath()).toBe("/new/path");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
    });

    it("setUrl() should change path when empty string specified", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.setUrl("");

      expect(locationUrl.getPath()).toBe("/");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
    });

    it("should parse new url", () => {
      let locationUrl = new Location("http://host.com/", "http://host.com/");

      locationUrl.parse("http://host.com/base");
      expect(locationUrl.getPath()).toBe("/base");

      locationUrl = new Location("http://host.com/", "http://host.com/", true);
      locationUrl.parse("http://host.com/base#");
      expect(locationUrl.getPath()).toBe("/base");
    });

    it("should prefix path with forward-slash", () => {
      const locationUrl = new Location(
        "http://server/",
        "http://server/",
        true,
      );

      locationUrl.setPath("b");

      expect(locationUrl.getPath()).toBe("/b");
      expect(locationUrl.absUrl).toBe("http://server/b");
    });

    it("should set path to forward-slash when empty", () => {
      const locationUrl = new Location(
        "http://server/",
        "http://server/",
        true,
      );

      locationUrl.parse("http://server/");
      expect(locationUrl.getPath()).toBe("/");
      expect(locationUrl.absUrl).toBe("http://server/");
    });

    it("setters should return Url object to allow chaining", () => {
      const locationUrl = createLocationHtml5Url();

      expect(locationUrl.setPath("/any")).toBe(locationUrl);
      expect(locationUrl.setSearch("")).toBe(locationUrl);
      expect(locationUrl.setHash("aaa")).toBe(locationUrl);
      expect(locationUrl.setUrl("/some")).toBe(locationUrl);
    });

    it("should not preserve old properties when parsing new url", () => {
      const locationUrl = createLocationHtml5Url();

      locationUrl.parse("http://www.domain.com:9877/a");

      expect(locationUrl.getPath()).toBe("/a");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.absUrl).toBe("http://www.domain.com:9877/a");
    });

    it("should prepend path with basePath", () => {
      const locationUrl = new Location(
        "http://server/base/",
        "http://server/base/",
        true,
      );

      locationUrl.parse("http://server/base/abc?a");
      expect(locationUrl.getPath()).toBe("/abc");
      expect(locationUrl.getSearch()).toEqual({ a: true });

      locationUrl.setPath("/new/path");
      expect(locationUrl.absUrl).toBe("http://server/base/new/path?a");
    });

    it("should throw error when invalid server url given", () => {
      const locationUrl = new Location(
        "http://server.org/base/abc",
        "http://server.org/base/",
        true,
      );

      expect(() => {
        locationUrl.parse("http://other.server.org/path#/path");
      }).toThrowError(/ipthprfx/);
    });

    it("should throw error when invalid base url given", () => {
      const locationUrl = new Location(
        "http://server.org/base/abc",
        "http://server.org/base/",
        true,
      );

      expect(() => {
        locationUrl.parse("http://server.org/path#/path");
      }).toThrowError(/ipthprfx/);
    });

    describe("state", () => {
      it("should set _stateand return itself", () => {
        const locationUrl = createLocationHtml5Url();

        expect(locationUrl._state).toEqual(undefined);

        const returned = locationUrl.setState({ a: 2 });

        expect(locationUrl._state).toEqual({ a: 2 });
        expect(returned).toBe(locationUrl);
      });

      it("should set state", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl.setState({ a: 2 });
        expect(locationUrl.getState()).toEqual({ a: 2 });
      });

      it("should allow to set both URL and state", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl.setUrl("/foo").setState({ a: 2 });
        expect(locationUrl.getUrl()).toEqual("/foo");
        expect(locationUrl.getState()).toEqual({ a: 2 });
      });

      it("should allow to mix state and various URL functions", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl
          .setPath("/foo")
          .setHash("abcd")
          .setState({ a: 2 })
          .setSearchParam("bar", "baz");

        expect(locationUrl.getPath()).toEqual("/foo");
        expect(locationUrl.getState()).toEqual({ a: 2 });
        expect(locationUrl.getSearch() && locationUrl.getSearch().bar).toBe(
          "baz",
        );
        expect(locationUrl.getHash()).toEqual("abcd");
      });
    });

    describe("encoding", () => {
      it("should encode special characters", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl.setPath("/a <>#");
        locationUrl.setSearch({ "i j": "<>#" });
        locationUrl.setHash("<>#");

        expect(locationUrl.getPath()).toBe("/a <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("<>#");
        expect(locationUrl.absUrl).toBe(
          "http://www.domain.com:9877/a%20%3C%3E%23?i%20j=%3C%3E%23#%3C%3E%23",
        );
      });

      it("should not encode !$:@", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl.setPath("/!$:@");
        locationUrl.setSearch("");
        locationUrl.setHash("!$:@");

        expect(locationUrl.absUrl).toBe("http://www.domain.com:9877/!$:@#!$:@");
      });

      it("should decode special characters", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );

        locationUrl.parse(
          "http://host.com/a%20%3C%3E%23?i%20j=%3C%3E%23#x%20%3C%3E%23",
        );
        expect(locationUrl.getPath()).toBe("/a <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("x <>#");
      });

      it("should not decode encoded forward slashes in the path", () => {
        const locationUrl = new Location(
          "http://host.com/base/",
          "http://host.com/base/",
          true,
        );

        locationUrl.parse("http://host.com/base/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.getPath()).toBe("/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.getSearch()).toEqual({});
        expect(locationUrl.getHash()).toBe("");
        expect(locationUrl.getUrl()).toBe("/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.absUrl).toBe(
          "http://host.com/base/a/ng2;path=%2Fsome%2Fpath",
        );
      });

      it("should decode pluses as spaces in urls", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );

        locationUrl.parse("http://host.com/?a+b=c+d");
        expect(locationUrl.getSearch()).toEqual({ "a b": "c d" });
      });

      it("should retain pluses when setting search queries", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl.setSearch({ "a+b": "c+d" });
        expect(locationUrl.getSearch()).toEqual({ "a+b": "c+d" });
      });

      it("should not drop encodings on already enconded params", () => {
        const locationUrl = createLocationHtml5Url();

        locationUrl.setUrl("/path/foo%2Fbar/baz%2Fqux");
        expect(locationUrl.getPath()).toEqual("/path/foo%2Fbar/baz%2Fqux");
      });
    });
  });

  describe("HashbangUrl", () => {
    function createHashbangUrl() {
      const locationUrl = new Location(
        "http://www.server.org:1234/base",
        "http://www.server.org:1234/",
        false,
        "#!",
      );

      locationUrl.parse("http://www.server.org:1234/base#!/path?a=b&c#hash");

      return locationUrl;
    }

    it("should parse hashbang url into path and search", () => {
      const locationUrl = createHashbangUrl();

      expect(locationUrl.getPath()).toBe("/path");
      expect(locationUrl.getSearch()).toEqual({ a: "b", c: true });
      expect(locationUrl.getHash()).toBe("hash");
    });

    it("absUrl should return hashbang url", () => {
      const locationUrl = createHashbangUrl();

      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base#!/path?a=b&c#hash",
      );

      locationUrl.setPath("/new/path");
      locationUrl.setSearch({ one: 1 });
      locationUrl.setHash("hhh");
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base#!/new/path?one=1#hhh",
      );
    });

    it("should preserve query params in base", () => {
      const locationUrl = new Location(
        "http://www.server.org:1234/base?base=param",
        "http://www.server.org:1234/",
        false,
        "#",
      );

      locationUrl.parse(
        "http://www.server.org:1234/base?base=param#/path?a=b&c#hash",
      );
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base?base=param#/path?a=b&c#hash",
      );

      locationUrl.setPath("/new/path");
      locationUrl.setSearch({ one: 1 });
      locationUrl.setHash("hhh");
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base?base=param#/new/path?one=1#hhh",
      );
    });

    it("should prefix path with forward-slash", () => {
      const locationUrl = new Location(
        "http://host.com/base",
        "http://host.com/",
        false,
        "#",
      );

      locationUrl.parse("http://host.com/base#path");
      expect(locationUrl.getPath()).toBe("/path");
      expect(locationUrl.absUrl).toBe("http://host.com/base#/path");

      locationUrl.setPath("wrong");
      expect(locationUrl.getPath()).toBe("/wrong");
      expect(locationUrl.absUrl).toBe("http://host.com/base#/wrong");
    });

    it("should set path to forward-slash when empty", () => {
      const locationUrl = new Location(
        "http://server/base",
        "http://server/",
        false,
        "#!",
      );

      locationUrl.parse("http://server/base");
      locationUrl.setPath("aaa");

      expect(locationUrl.getPath()).toBe("/aaa");
      expect(locationUrl.absUrl).toBe("http://server/base#!/aaa");
    });

    it("should not preserve old properties when parsing new url", () => {
      const locationUrl = createHashbangUrl();

      locationUrl.parse("http://www.server.org:1234/base#!/");

      expect(locationUrl.getPath()).toBe("/");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.absUrl).toBe("http://www.server.org:1234/base#!/");
    });

    it("should insert default hashbang if a hash is given with no hashbang prefix", () => {
      const locationUrl = createHashbangUrl();

      locationUrl.parse("http://www.server.org:1234/base#/path");
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base#!#%2Fpath",
      );
      expect(locationUrl.getHash()).toBe("/path");
      expect(locationUrl.getPath()).toBe("");

      locationUrl.parse("http://www.server.org:1234/base#");
      expect(locationUrl.absUrl).toBe("http://www.server.org:1234/base");
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.getPath()).toBe("");
    });

    it("should ignore extra path segments if no hashbang is given", () => {
      const locationUrl = createHashbangUrl();

      locationUrl.parse("http://www.server.org:1234/base/extra/path");
      expect(locationUrl.absUrl).toBe("http://www.server.org:1234/base");
      expect(locationUrl.getPath()).toBe("");
      expect(locationUrl.getHash()).toBe("");
    });

    describe("encoding", () => {
      it("should encode special characters", () => {
        const locationUrl = createHashbangUrl();

        locationUrl.setPath("/a <>#");
        locationUrl.setSearch({ "i j": "<>#" });
        locationUrl.setHash("<>#");

        expect(locationUrl.getPath()).toBe("/a <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("<>#");
        expect(locationUrl.absUrl).toBe(
          "http://www.server.org:1234/base#!/a%20%3C%3E%23?i%20j=%3C%3E%23#%3C%3E%23",
        );
      });

      it("should not encode !$:@", () => {
        const locationUrl = createHashbangUrl();

        locationUrl.setPath("/!$:@");
        locationUrl.setSearch("");
        locationUrl.setHash("!$:@");

        expect(locationUrl.absUrl).toBe(
          "http://www.server.org:1234/base#!/!$:@#!$:@",
        );
      });

      it("should decode special characters", () => {
        const locationUrl = new Location(
          "http://host.com/a",
          "http://host.com/",
          false,
          "#",
        );

        locationUrl.parse(
          "http://host.com/a#/%20%3C%3E%23?i%20j=%3C%3E%23#x%20%3C%3E%23",
        );
        expect(locationUrl.getPath()).toBe("/ <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("x <>#");
      });

      it("should return decoded characters for search specified in URL", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );

        locationUrl.parse("http://host.com/?q=1%2F2%203");
        expect(locationUrl.getSearch()).toEqual({ q: "1/2 3" });
      });

      it("should return decoded characters for search specified with setter", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );

        locationUrl.parse("http://host.com/");
        locationUrl.setSearchParam("q", "1/2 3");
        expect(locationUrl.getSearch()).toEqual({ q: "1/2 3" });
      });

      it("should return an array for duplicate params", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );

        locationUrl.parse("http://host.com");
        locationUrl.setSearchParam("q", ["1/2 3", "4/5 6"]);
        expect(locationUrl.getSearch()).toEqual({ q: ["1/2 3", "4/5 6"] });
      });

      it("should encode an array correctly from search and add to url", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );

        locationUrl.parse("http://host.com");
        locationUrl.setSearch({ q: ["1/2 3", "4/5 6"] });
        expect(locationUrl.absUrl).toEqual(
          "http://host.com?q=1%2F2%203&q=4%2F5%206",
        );
      });

      it("should rewrite params when specifying a single param in search", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );

        locationUrl.parse("http://host.com");
        locationUrl.setSearch({ q: "1/2 3" });
        expect(locationUrl.absUrl).toEqual("http://host.com?q=1%2F2%203");
        locationUrl.setSearch({ q: "4/5 6" });
        expect(locationUrl.absUrl).toEqual("http://host.com?q=4%2F5%206");
      });

      it("setUrl should decode non-component special characters in hashbang mode", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          false,
        );

        locationUrl.parse("http://host.com");
        locationUrl.setUrl("/foo%3Abar");
        expect(locationUrl.getPath()).toEqual("/foo%3Abar");
      });

      it("setUrl should decode non-component special characters in html5 mode", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );

        locationUrl.parse("http://host.com");
        locationUrl.setUrl("/foo%3Abar");
        expect(locationUrl.getPath()).toEqual("/foo:bar");
      });
    });
  });

  describe("encodePath", () => {
    it("should encode each segment but preserve slashes", () => {
      const input = "user profile/images/pic 1.jpg";

      const result = encodePath(input);

      expect(result).toBe("user%20profile/images/pic%201.jpg");
    });

    it("should re-encode previously encoded forward slashes as literal slashes", () => {
      const input = "folder1%2Fsub/folder2";

      const result = encodePath(input);

      expect(result).toBe("folder1%2Fsub/folder2");
    });

    it("should handle special characters properly", () => {
      const input = "a$bc/def@gh";

      const result = encodePath(input);

      expect(result).toBe("a$bc/def@gh");
    });

    it("should return empty string for empty path", () => {
      const input = "";

      const result = encodePath(input);

      expect(result).toBe("");
    });

    it("should handle single segment", () => {
      const input = "hello world";

      const result = encodePath(input);

      expect(result).toBe("hello%20world");
    });

    it("should not double encode already encoded segments except slashes", () => {
      const input = "one%20two/three%2Ffour";

      const result = encodePath(input);

      expect(result).toBe("one%20two/three%2Ffour");
    });

    it("should not double encode already encoded segments", () => {
      const input = "double%20encoded";

      const result = encodePath(input);

      expect(result).toBe("double%20encoded");
    });

    it("should preserve double encoded segments as-is (single decode only)", () => {
      const input = "double%2520encoded";

      const result = encodePath(input);

      expect(result).toBe("double%2520encoded"); // double % stays double encoded
    });

    it("should preserve leading and trailing slashes", () => {
      const input = "/a b/c d/";

      const result = encodePath(input);

      expect(result).toBe("/a%20b/c%20d/");
    });

    it("should preserve multiple consecutive slashes as empty segments", () => {
      const input = "foo//bar///baz";

      const result = encodePath(input);

      expect(result).toBe("foo//bar///baz");
    });

    it("should not encode RFC 3986 reserved characters in segments", () => {
      const input = "key=value/param+test";

      const result = encodePath(input);

      expect(result).toBe("key=value/param+test");
    });

    it("should encode unicode characters properly", () => {
      const input = "café/naïve";

      const result = encodePath(input);

      expect(result).toBe("caf%C3%A9/na%C3%AFve");
    });

    it("should handle input with only slashes", () => {
      const input = "///";

      const result = encodePath(input);

      expect(result).toBe("///");
    });

    it("should treat encoded slashes as literal and decoded slashes as separators", () => {
      const input = "part1%2Fsub/part2";

      const result = encodePath(input);

      expect(result).toBe("part1%2Fsub/part2");
    });
  });

  describe("decodePath", () => {
    it("should decode percent-encoded segments", () => {
      const input = "hello%20world/abc%40def";

      const result = decodePath(input, false);

      expect(result).toBe("hello world/abc@def");
    });

    it("should encode slashes as %2F in html5Mode", () => {
      const input = "section%2Fname/data";

      const result = decodePath(input, true);

      expect(result).toBe("section%2Fname/data");
    });

    it("should preserve decoded forward slashes in html5Mode", () => {
      const input = "foo/bar%2Fbaz/qux";

      const result = decodePath(input, true);

      // 'bar/baz' becomes 'bar%2Fbaz'
      expect(result).toBe("foo/bar%2Fbaz/qux");
    });

    it("should not change decoded slashes when html5Mode is false", () => {
      const input = "foo/bar%2Fbaz/qux";

      const result = decodePath(input, false);

      expect(result).toBe("foo/bar/baz/qux");
    });

    it("should handle empty segments correctly", () => {
      const input = "a//b";

      const result = decodePath(input, false);

      expect(result).toBe("a//b"); // empty segment remains
    });

    it("should decode already decoded values without errors", () => {
      const input = "simple/path";

      const result = decodePath(input, false);

      expect(result).toBe("simple/path");
    });

    it("should decode and re-encode all forward slashes in segments when html5Mode is true", () => {
      const input = "a%2Fb/c%2Fd";

      const result = decodePath(input, true);

      expect(result).toBe("a%2Fb/c%2Fd");
    });

    it("should return an empty string if given an empty string", () => {
      expect(decodePath("", false)).toBe("");
      expect(decodePath("", true)).toBe("");
    });

    it("should decode double-encoded segments only once", () => {
      const input = "double%2520encoded"; // '%2520' = '%20'

      const result = decodePath(input, false);

      expect(result).toBe("double%20encoded"); // Only decode once
    });

    it("should correctly decode reserved URI characters", () => {
      const input = "%3A%3B%26%3D";

      const result = decodePath(input, false);

      expect(result).toBe(":;&=");
    });

    it("should throw URIError for malformed percent encodings", () => {
      const input = "bad%encoding";

      expect(() => decodePath(input, false)).toThrowError(URIError);
    });

    it("should preserve leading and trailing empty segments", () => {
      const input = "/path/with/trailing/";

      const result = decodePath(input, false);

      expect(result).toBe("/path/with/trailing/");
    });

    it("should re-encode slashes inside segments when html5Mode is true", () => {
      const input = "path%2Fsegment/next";

      const result = decodePath(input, true);

      expect(result).toBe("path%2Fsegment/next");
    });

    it("should handle completely empty segments (multiple slashes)", () => {
      const input = "///";

      const result = decodePath(input, false);

      expect(result).toBe("///");
    });
  });

  describe("normalizePath", () => {
    it("should encode the path, append search and hash correctly", () => {
      const path = "folder name/file name";

      const search = { q: "test", page: "1" };

      const hash = "section 2";

      const result = normalizePath(path, search, hash);

      expect(result).toBe(
        "folder%20name/file%20name?q=test&page=1#section%202",
      );
    });

    it("should return path only if no search and no hash", () => {
      const path = "simple/path";

      const result = normalizePath(path, null, null);

      expect(result).toBe("simple/path");
    });

    it("should correctly encode search params from object", () => {
      const search = { a: "1", b: "2" };

      const result = normalizePath("path", search, null);

      expect(result).toBe("path?a=1&b=2");
    });

    it("should correctly encode array values in search", () => {
      const search = { a: ["1", "2"] };

      const result = normalizePath("path", search, null);

      // Expected: a=1&a=2 (both keys repeated)
      expect(result).toBe("path?a=1&a=2");
    });

    it("should handle boolean true values", () => {
      const search = { flag: true };

      const result = normalizePath("path", search, null);

      expect(result).toBe("path?flag");
    });

    it("should encode hash value properly", () => {
      const path = "path";

      const hash = "hello world";

      const result = normalizePath(path, null, hash);

      expect(result).toBe("path#hello%20world");
    });

    it("should not append ? if search is empty string or empty object", () => {
      expect(normalizePath("path", "", "hash")).toBe("path#hash");
      expect(normalizePath("path", {}, "hash")).toBe("path#hash");
    });

    it("should handle empty path gracefully", () => {
      const result = normalizePath("", { a: "1" }, "h");

      expect(result).toBe("?a=1#h");
    });
  });

  describe("parseAppUrl", () => {
    it("should throw error on url starting with // or \\\\", () => {
      expect(() => parseAppUrl("//invalid/path", false)).toThrowError(
        /Invalid url/,
      );
      expect(() => parseAppUrl("\\\\invalid\\path", false)).toThrowError(
        /Invalid url/,
      );
    });

    it("should add leading slash if missing and parse url correctly", () => {
      const result = parseAppUrl("some/path?foo=bar#hashValue", false);

      expect(result.path).toBe("/some/path");
      expect(result.search).toEqual(jasmine.objectContaining({ foo: "bar" }));
      expect(result.hash).toBe("hashValue");
    });

    it("should keep leading slash if present", () => {
      const result = parseAppUrl("/already/slashed?x=1#abc", false);

      expect(result.path).toBe("/already/slashed");
      expect(result.search).toEqual(jasmine.objectContaining({ x: "1" }));
      expect(result.hash).toBe("abc");
    });

    it("should remove leading slash from path if prefixed and path starts with slash", () => {
      const result = parseAppUrl("foo/bar", false);

      expect(result.path.charAt(0)).toBe("/");
      expect(result.path).toBe("/foo/bar");
    });

    it("should set empty $$search when no query params", () => {
      expect(parseAppUrl("/pathOnly", false).search).toEqual({});
    });

    it("should decode hash correctly", () => {
      expect(parseAppUrl("/path#%23encoded", false).hash).toBe("#encoded");
    });
  });

  describe("stripBaseUrl", () => {
    it("should return substring after base if url starts with base", () => {
      expect(stripBaseUrl("/base", "/base/some/path")).toBe("/some/path");
      expect(
        stripBaseUrl("http://example.com", "http://example.com/page"),
      ).toBe("/page");
      expect(stripBaseUrl("", "/anything")).toBe("/anything"); // empty base returns full url
    });

    it("should return empty string if url equals base", () => {
      expect(stripBaseUrl("/base", "/base")).toBe("");
    });

    it("should return undefined if url does not start with base", () => {
      expect(stripBaseUrl("/base", "/notbase/something")).toBeUndefined();
      expect(
        stripBaseUrl("http://example.com", "https://example.com/page"),
      ).toBeUndefined();
    });

    it("should handle base being longer than url", () => {
      expect(stripBaseUrl("/longer/base", "/short")).toBeUndefined();
    });

    it("should be case sensitive", () => {
      expect(stripBaseUrl("/Base", "/base/something")).toBeUndefined();
    });
  });

  describe("stripHash", () => {
    it("should return the same URL if there is no hash", () => {
      expect(stripHash("http://example.com/path")).toBe(
        "http://example.com/path",
      );
      expect(stripHash("/some/path")).toBe("/some/path");
    });

    it("should remove the hash and everything after it", () => {
      expect(stripHash("http://example.com/path#section1")).toBe(
        "http://example.com/path",
      );
      expect(stripHash("/path/to/resource#hashvalue")).toBe(
        "/path/to/resource",
      );
    });

    it("should remove hash even if it is at the very end", () => {
      expect(stripHash("http://example.com/#")).toBe("http://example.com/");
    });

    it("should handle empty string input", () => {
      expect(stripHash("")).toBe("");
    });

    it("should handle hash only string", () => {
      expect(stripHash("#hashonly")).toBe("");
    });
  });

  describe("stripFile", () => {
    it("removes filename from URL without hash", () => {
      const input = "https://example.com/path/to/file.js";

      const expected = "https://example.com/path/to/";

      expect(stripFile(input)).toBe(expected);
    });

    it("removes filename and hash from URL", () => {
      const input = "https://example.com/path/to/file.js#section";

      const expected = "https://example.com/path/to/";

      expect(stripFile(input)).toBe(expected);
    });

    it("handles root URL with file", () => {
      const input = "https://example.com/file.js";

      const expected = "https://example.com/";

      expect(stripFile(input)).toBe(expected);
    });

    it("handles URL with no file", () => {
      const input = "https://example.com/path/to/";

      const expected = "https://example.com/path/to/";

      expect(stripFile(input)).toBe(expected);
    });

    it("handles relative URL with file and hash", () => {
      const input = "docs/static/app.js#v1";

      const expected = "docs/static/";

      expect(stripFile(input)).toBe(expected);
    });
  });

  describe("serverBase", () => {
    it("returns server base for https URL without port", () => {
      const input = "https://example.com/path/to/resource";

      const expected = "https://example.com";

      expect(serverBase(input)).toBe(expected);
    });

    it("returns server base for http URL with port", () => {
      const input = "http://localhost:8080/api/data";

      const expected = "http://localhost:8080";

      expect(serverBase(input)).toBe(expected);
    });

    it("returns server base for URL with subdomain", () => {
      const input = "https://api.example.com/v1/query";

      const expected = "https://api.example.com";

      expect(serverBase(input)).toBe(expected);
    });

    it("returns full URL if no path is present", () => {
      const input = "https://example.com";

      const expected = "https://example.com";

      expect(serverBase(input)).toBe(expected);
    });

    it("handles trailing slash after host", () => {
      const input = "https://example.com/";

      const expected = "https://example.com";

      expect(serverBase(input)).toBe(expected);
    });
  });

  describe("urlsEqual", () => {
    it("matches same URL", () => {
      expect(
        urlsEqual("http://example.com/foo", "http://example.com/foo"),
      ).toBe(true);
    });

    it("ignores trailing slash", () => {
      expect(
        urlsEqual("http://example.com/foo/", "http://example.com/foo"),
      ).toBe(true);
    });

    it("ignores encoded spaces", () => {
      expect(
        urlsEqual("http://example.com/foo%20bar", "http://example.com/foo bar"),
      ).toBe(true);
    });

    it("ignores empty hash", () => {
      expect(
        urlsEqual("http://example.com/foo#", "http://example.com/foo"),
      ).toBe(true);
    });

    it("resolves relative to base href", () => {
      const base = document.createElement("base");

      base.href = "http://localhost/";
      document.head.appendChild(base);

      expect(urlsEqual("/bar", "http://localhost/bar")).toBe(true);

      document.head.removeChild(base); // cleanup
    });

    it("uses native normalization for default ports, dot segments, and Unicode hosts", () => {
      expect(
        urlsEqual("http://EXAMPLE.com:80/a/../b#", "http://example.com/b"),
      ).toBeTrue();
      expect(
        urlsEqual("https://särver/path", "https://xn--srver-gra/path"),
      ).toBeTrue();
      expect(urlsEqual("http://example.com/", "http://example.com")).toBeTrue();
    });

    it("returns false for different paths", () => {
      expect(
        urlsEqual("http://example.com/foo", "http://example.com/bar"),
      ).toBe(false);
    });
  });

  describe("runtime configuration", () => {
    it("applies typed policy before creating the service", () => {
      module.config({
        $location: {
          html5Mode: false,
          hashPrefix: "~",
        },
      });

      const location = window.angular
        .bootstrap(document.createElement("div"), ["test1"])
        .get("$location");

      expect(location.html5).toBeFalse();
      expect(location.hashPrefix).toBe("#~");
    });
  });

  describe("Location with html5 url", () => {
    let locationUrl;

    let locationUmlautUrl;

    let locationIndexUrl;

    beforeEach(() => {
      locationUrl = new Location("http://server/pre/", "http://server/pre/");
      locationUmlautUrl = new Location(
        "http://särver/pre/",
        "http://särver/pre/",
      );
      locationIndexUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
      );
    });

    it("should rewrite URL", () => {
      expect(parseLinkAndReturn(locationUrl, "http://other")).toEqual(
        undefined,
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre")).toEqual(
        "http://server/pre/",
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre/")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationUrl, "http://server/pre/otherPath"),
      ).toEqual("http://server/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(locationUrl, "someIgnoredAbsoluteHref", "#test"),
      ).toEqual("http://server/pre/otherPath#test");

      expect(parseLinkAndReturn(locationUmlautUrl, "http://other")).toEqual(
        undefined,
      );
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre"),
      ).toEqual("http://särver/pre/");
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre/"),
      ).toEqual("http://särver/pre/");
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre/otherPath"),
      ).toEqual("http://särver/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(
          locationUmlautUrl,
          "someIgnoredAbsoluteHref",
          "#test",
        ),
      ).toEqual("http://särver/pre/otherPath#test");

      expect(parseLinkAndReturn(locationIndexUrl, "http://server/pre")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationIndexUrl, "http://server/pre/"),
      ).toEqual("http://server/pre/");
      expect(
        parseLinkAndReturn(locationIndexUrl, "http://server/pre/otherPath"),
      ).toEqual("http://server/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(locationUrl, "someIgnoredAbsoluteHref", "#test"),
      ).toEqual("http://server/pre/otherPath#test");
    });

    it("should complain if the path starts with double slashes", () => {
      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre///other/path");
      }).toThrowError(/badpath/);

      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre/\\\\other/path");
      }).toThrowError(/badpath/);

      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre//\\//other/path");
      }).toThrowError(/badpath/);
    });

    it("should support state", () => {
      expect(locationUrl.setState({ a: 2 }).getState()).toEqual({ a: 2 });
    });
  });

  describe("Location with hashbang url", () => {
    let locationUrl;

    it("should rewrite URL", () => {
      locationUrl = new Location(
        "http://server/pre/",
        "http://server/pre/",
        false,
        "#",
      );

      expect(parseLinkAndReturn(locationUrl, "http://other")).toEqual(
        undefined,
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre/")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationUrl, "http://server/pre/#otherPath"),
      ).toEqual("http://server/pre/#/otherPath");

      expect(parseLinkAndReturn(locationUrl, "javascript:void(0)")).toEqual(
        undefined,
      );
    });

    it("should not set hash if one was not originally specified", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/pre/index.html");
      expect(locationUrl.getUrl()).toBe("");
      expect(locationUrl.absUrl).toBe("http://server/pre/index.html");
    });

    it("should parse hash if one was specified", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/pre/index.html#/foo/bar");
      expect(locationUrl.getUrl()).toBe("/foo/bar");
      expect(locationUrl.absUrl).toBe("http://server/pre/index.html#/foo/bar");
    });

    it("should prefix hash url with / if one was originally missing", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/pre/index.html#not-starting-with-slash");
      expect(locationUrl.getUrl()).toBe("/not-starting-with-slash");
      expect(locationUrl.absUrl).toBe(
        "http://server/pre/index.html#/not-starting-with-slash",
      );
    });

    it("should not strip stuff from path just because it looks like Windows drive when it's not", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse(
        "http://server/pre/index.html#http%3A%2F%2Fexample.com%2F",
      );
      expect(locationUrl.getUrl()).toBe("/http://example.com/");
      expect(locationUrl.absUrl).toBe(
        "http://server/pre/index.html#/http://example.com/",
      );
    });

    it("should allow navigating outside the original base URL", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/next/index.html");
      expect(locationUrl.getUrl()).toBe("");
      expect(locationUrl.absUrl).toBe("http://server/next/index.html");
    });
  });

  function parseLinkAndReturn(location, url, relHref) {
    if (location.parseLinkUrl(url, relHref)) {
      return location.absUrl;
    }

    return undefined;
  }
});
