// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc, getController } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("geolocation directive", () => {
  let $compile;
  let $rootScope;
  let app: HTMLElement;

  beforeEach(() => {
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);
    app.innerHTML = "";

    new Angular().bootstrap(app, []).invoke([
      "$compile",
      "$rootScope",
      (_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(app);
  });

  function compileGeolocation(
    markup = '<geolocation ng-model="position"></geolocation>',
  ) {
    const scope = $rootScope.new();
    app.innerHTML = markup;
    $compile(app)(scope);

    return {
      element: app.querySelector("geolocation") as HTMLElement,
      scope,
    };
  }

  function exposeResult(element, readPosition, readError = () => null) {
    Object.defineProperties(element, {
      position: { configurable: true, get: readPosition },
      error: { configurable: true, get: readError },
    });
  }

  function position(latitude = 56.9496) {
    return {
      coords: {
        latitude,
        longitude: 24.1052,
        accuracy: 4.5,
        altitude: 12,
        altitudeAccuracy: 8,
        heading: 90,
        speed: 1.25,
      },
      timestamp: 1_788_192_000_000,
    };
  }

  it("writes a serializable position while preserving native attributes", async () => {
    const { element, scope } = compileGeolocation(`
      <geolocation ng-model="position" ng-el="locationPicker" watch>
        <button type="button">Use my location</button>
      </geolocation>
    `);
    exposeResult(element, () => position());

    element.dispatchEvent(new Event("location"));
    await wait();

    expect(scope.position).toEqual({
      latitude: 56.9496,
      longitude: 24.1052,
      accuracy: 4.5,
      altitude: 12,
      altitudeAccuracy: 8,
      heading: 90,
      speed: 1.25,
      timestamp: 1_788_192_000_000,
    });
    expect(JSON.parse(JSON.stringify(scope.position))).toEqual(scope.position);
    expect(scope.locationPicker).toBe(element);
    expect(element.hasAttribute("watch")).toBeTrue();
    expect(element.querySelector("button")?.textContent).toBe(
      "Use my location",
    );
    expect(getController(element, "ngModel").valid).toBeTrue();
  });

  it("creates a fresh snapshot for every location event", async () => {
    const { element, scope } = compileGeolocation();
    let nativePosition = position();
    exposeResult(element, () => nativePosition);

    element.dispatchEvent(new Event("location"));
    await wait();
    const first = scope.position;

    nativePosition = position(57.1);
    element.dispatchEvent(new Event("location"));
    await wait();

    expect(scope.position.latitude).toBe(57.1);
    expect(scope.position).not.toBe(first);
    expect(first.latitude).toBe(56.9496);
  });

  it("clears the model and reports geolocation failures", async () => {
    const { element, scope } = compileGeolocation();
    let nativePosition = position();
    let nativeError = null;
    exposeResult(
      element,
      () => nativePosition,
      () => nativeError,
    );

    element.dispatchEvent(new Event("location"));
    await wait();

    nativePosition = null;
    nativeError = { code: 1, message: "Permission denied" };
    element.dispatchEvent(new Event("location"));
    await wait();

    const controller = getController(element, "ngModel");
    expect(scope.position).toBeUndefined();
    expect(controller.invalid).toBeTrue();
    expect(controller.error.geolocation).toBeTrue();
  });

  it("does not write model values back to the native position", async () => {
    const { element, scope } = compileGeolocation();
    let writes = 0;
    Object.defineProperty(element, "position", {
      configurable: true,
      get: () => null,
      set: () => {
        writes += 1;
      },
    });

    scope.position = { latitude: 1, longitude: 2 };
    await wait();

    expect(writes).toBe(0);
  });

  it("works as an unsupported fallback without ng-model", () => {
    const { element } = compileGeolocation(`
      <geolocation autolocate>
        <button type="button">Location is unavailable</button>
      </geolocation>
    `);

    expect(() => element.dispatchEvent(new Event("location"))).not.toThrow();
    expect(element.hasAttribute("autolocate")).toBeTrue();
    expect(element.textContent).toContain("Location is unavailable");
  });

  it("stops observing after element and scope teardown", async () => {
    const { element, scope } = compileGeolocation();
    let nativePosition = position();
    exposeResult(element, () => nativePosition);

    element.dispatchEvent(new Event("location"));
    await wait();
    dealoc(element);
    scope.destroy();

    nativePosition = position(58);
    element.dispatchEvent(new Event("location"));
    await wait();

    expect(scope.position.latitude).toBe(56.9496);
  });
});
