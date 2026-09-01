import type { NgModelController } from "../model/model.ts";

/**
 * Plain, serializable location data written by the `geolocation` directive.
 *
 * @experimental Browser support for the HTML `geolocation` element is limited.
 */
export interface GeolocationValue {
  /** Latitude in decimal degrees. */
  readonly latitude: number;
  /** Longitude in decimal degrees. */
  readonly longitude: number;
  /** Position accuracy in metres. */
  readonly accuracy: number;
  /** Altitude in metres, or `null` when unavailable. */
  readonly altitude: number | null;
  /** Altitude accuracy in metres, or `null` when unavailable. */
  readonly altitudeAccuracy: number | null;
  /** Direction of travel in degrees, or `null` when unavailable. */
  readonly heading: number | null;
  /** Speed in metres per second, or `null` when unavailable. */
  readonly speed: number | null;
  /** Time when the position was acquired, in milliseconds since the epoch. */
  readonly timestamp: number;
}

type GeolocationElement = HTMLElement & {
  readonly position?: GeolocationPosition | null;
  readonly error?: GeolocationPositionError | null;
};

function snapshotPosition(position: GeolocationPosition): GeolocationValue {
  const { coords } = position;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: coords.heading,
    speed: coords.speed,
    timestamp: position.timestamp,
  };
}

/**
 * Connects the experimental HTML `geolocation` element to `ng-model`.
 *
 * The binding is intentionally one-way. Native `location` events write a
 * serializable {@link GeolocationValue} to the model. Model changes do not
 * request permission or write to the element's read-only `position` property.
 */
export function geolocationDirective(): ng.Directive {
  return {
    restrict: "E",
    require: "?ngModel",
    link(
      scope: ng.Scope,
      element: Element,
      ngModelController?: NgModelController,
    ): void {
      if (!ngModelController) {
        return;
      }

      const geolocationElement = element as GeolocationElement;

      ngModelController.isEmpty = (value: unknown): boolean => value == null;
      ngModelController.render = (): void => undefined;

      const publishLocation = (): void => {
        const position = geolocationElement.position;

        if (geolocationElement.error || !position) {
          ngModelController.setViewValue(undefined, "location");
          ngModelController.setValidity("geolocation", false);
          return;
        }

        ngModelController.setValidity("geolocation", true);
        ngModelController.setViewValue(snapshotPosition(position), "location");
      };

      const cleanup = (): void => {
        geolocationElement.removeEventListener("location", publishLocation);
        geolocationElement.removeEventListener("$destroy", cleanup);
        deregisterDestroy();
      };

      geolocationElement.addEventListener("location", publishLocation);
      geolocationElement.addEventListener("$destroy", cleanup, { once: true });
      const deregisterDestroy = scope.on("$destroy", cleanup);
    },
  };
}
