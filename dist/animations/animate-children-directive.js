import { _interpolate } from '../injection-tokens.js';
import { setCacheData } from '../shared/dom.js';
import { isString } from '../shared/utils.js';
import { NG_ANIMATE_CHILDREN_DATA } from './shared.js';

$$AnimateChildrenDirective.$inject = [_interpolate];
/** Propagates `ng-animate-children` state to the element cache for animation lookups. */
function $$AnimateChildrenDirective($interpolate) {
    return {
        link(scope, element, attrs) {
            const val = attrs.ngAnimateChildren;
            if (isString(val) && val.length === 0) {
                // empty attribute
                setCacheData(element, NG_ANIMATE_CHILDREN_DATA, true);
            }
            else {
                // Interpolate and set the value, so that it is available to
                // animations that run right after compilation
                const interpolateFn = $interpolate(val);
                setData(interpolateFn ? interpolateFn(scope) : undefined);
                attrs.$observe("ngAnimateChildren", setData);
            }
            function setData(value) {
                const res = value === "on" || value === "true";
                setCacheData(element, NG_ANIMATE_CHILDREN_DATA, res);
            }
        },
    };
}

export { $$AnimateChildrenDirective };
