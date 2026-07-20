/** @internal */
function createRouterViewControllerInvocationLocals(resolves, scope, element) {
    return { ...resolves, $scope: scope, $element: element };
}

export { createRouterViewControllerInvocationLocals };
