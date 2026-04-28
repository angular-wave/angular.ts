/** Prevents AngularTS from compiling or binding the contents of the element. */
function ngNonBindableDirective() {
    return {
        terminal: true,
        priority: 1000,
    };
}

export { ngNonBindableDirective };
