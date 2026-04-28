export class DisabledTemplateRequestProvider {
  $get = () => {
    return (templateUrl: string) =>
      Promise.reject(
        new Error(
          `$templateRequest is not available in this custom build: ${templateUrl}`,
        ),
      );
  };
}

export class DisabledControllerProvider {
  $get = () => {
    return () => {
      throw new Error("$controller is not available in this custom build.");
    };
  };
}
