export const registerUpdateUrl = (
  transitionService,
  stateService,
  urlService,
) => {
  /**
   * A [[TransitionHookFn]] which updates the URL after a successful transition
   *
   * Registered using `transitionService.onSuccess({}, updateUrl);`
   */
  const updateUrl = (transition) => {
    const options = transition.options();

    const $state = stateService;

    // Dont update the url in these situations:
    // The transition was triggered by a URL sync (options.source === 'url')
    // The user doesn't want the url to update (options.location === false)
    // The destination state, and all parents have no navigable url
    if (
      options.source !== "url" &&
      options.location &&
      $state.$current.navigable
    ) {
      const urlOptions = { replace: options.location === "replace" };

      urlService.push(
        $state.$current.navigable.url,
        $state.globals.params,
        urlOptions,
      );
    }
    urlService.update(true);
  };

  transitionService.onSuccess({}, updateUrl, { priority: 9999 });
};
