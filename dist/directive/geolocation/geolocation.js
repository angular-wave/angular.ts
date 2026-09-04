function snapshotPosition(position) {
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
function geolocationDirective() {
    return {
        restrict: "E",
        require: "?ngModel",
        link(scope, element, ngModelController) {
            if (!ngModelController) {
                return;
            }
            const geolocationElement = element;
            ngModelController.isEmpty = (value) => value == null;
            ngModelController.render = () => undefined;
            const publishLocation = () => {
                const position = geolocationElement.position;
                if (geolocationElement.error || !position) {
                    ngModelController.setViewValue(undefined, "location");
                    ngModelController.setValidity("geolocation", false);
                    return;
                }
                ngModelController.setValidity("geolocation", true);
                ngModelController.setViewValue(snapshotPosition(position), "location");
            };
            const cleanup = () => {
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

export { geolocationDirective };
