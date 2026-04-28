class DisabledTemplateRequestProvider {
    constructor() {
        this.$get = () => {
            return (templateUrl) => Promise.reject(new Error(`$templateRequest is not available in this custom build: ${templateUrl}`));
        };
    }
}
class DisabledControllerProvider {
    constructor() {
        this.$get = () => {
            return () => {
                throw new Error("$controller is not available in this custom build.");
            };
        };
    }
}

export { DisabledControllerProvider, DisabledTemplateRequestProvider };
