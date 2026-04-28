import { _rootScope, _injector } from '../injection-tokens.js';
import { setCacheData, removeElementData, getCacheData, deleteCacheData } from '../shared/dom.js';
import { mergeClasses, values, isArray } from '../shared/utils.js';
import { prepareAnimationOptions, PREPARE_CLASS_SUFFIX, NG_ANIMATE_CLASSNAME, applyAnimationClasses, applyAnimationStyles } from './shared.js';
import { AnimateRunner } from './runner/animate-runner.js';
import { animateCache } from './cache/animate-cache.js';
import { rafScheduler } from './raf/raf-scheduler.js';

const RUNNER_STORAGE_KEY = "$$animationRunner";
const PREPARE_CLASSES_KEY = "$$animatePrepareClasses";
class AnimationProvider {
    constructor() {
        /** @internal */
        this._drivers = [];
        this.$get = [
            _rootScope,
            _injector,
            /** Creates the runtime animation service. */
            ($rootScope, $injector) => {
                return this._createAnimationService($rootScope, $injector, this._drivers);
            },
        ];
    }
    /** Builds the animation runtime around the configured driver chain. */
    /** @internal */
    _createAnimationService($rootScope, $injector, drivers) {
        const NG_ANIMATE_REF_ATTR = "ng-animate-ref";
        const animationQueue = [];
        /** Retrieves the active runner associated with an element, if any. */
        const getRunner = (element) => {
            return getCacheData(element, RUNNER_STORAGE_KEY);
        };
        /** Sorts animations by DOM depth so parent/child ordering is stable. */
        const sortAnimations = (animations) => {
            const tree = {
                children: [],
            };
            let i;
            const lookup = new Map();
            // this is done first beforehand so that the map
            // is filled with a list of the elements that will be animated
            for (i = 0; i < animations.length; i++) {
                const animation = animations[i];
                lookup.set(animation.domNode, (animations[i] = {
                    domNode: animation.domNode,
                    element: animation.element,
                    fn: animation.fn,
                    children: [],
                }));
            }
            for (i = 0; i < animations.length; i++) {
                processNode(animations[i]);
            }
            return flatten(tree);
            /** Places a node under its nearest queued parent entry. */
            function processNode(entry) {
                if (entry.processed)
                    return entry;
                entry.processed = true;
                const elementNode = entry.domNode;
                let { parentNode } = elementNode;
                lookup.set(elementNode, entry);
                let parentEntry;
                while (parentNode) {
                    parentEntry = lookup.get(parentNode);
                    if (parentEntry) {
                        if (!parentEntry.processed) {
                            parentEntry = processNode(parentEntry);
                        }
                        break;
                    }
                    ({ parentNode } = parentNode);
                }
                (parentEntry || tree).children.push(entry);
                return entry;
            }
            /** Flattens the animation tree into depth-based execution rows. */
            function flatten(theeParam) {
                const result = [];
                const queue = [];
                for (i = 0; i < theeParam.children.length; i++) {
                    queue.push(theeParam.children[i]);
                }
                let remainingLevelEntries = queue.length;
                let nextLevelEntries = 0;
                let row = [];
                let j = 0;
                while (j < queue.length) {
                    const entry = queue[j];
                    if (remainingLevelEntries <= 0) {
                        remainingLevelEntries = nextLevelEntries;
                        nextLevelEntries = 0;
                        result.push(row);
                        row = [];
                    }
                    row.push(entry);
                    entry.children.forEach((childEntry) => {
                        nextLevelEntries++;
                        queue.push(childEntry);
                    });
                    remainingLevelEntries--;
                    j++;
                }
                if (row.length) {
                    result.push(row);
                }
                return result;
            }
        };
        /** Queues an animation request and returns the runner managing it. */
        return (elementParam, event, optionsParam) => {
            const options = prepareAnimationOptions(optionsParam);
            const isStructural = ["enter", "move", "leave"].indexOf(event) >= 0;
            const runner = new AnimateRunner({
                end() {
                    close();
                },
                cancel() {
                    close(true);
                },
            });
            if (!drivers.length) {
                close();
                return runner;
            }
            let classes = mergeClasses(elementParam.getAttribute("class"), mergeClasses(options.addClass, options.removeClass));
            let { tempClasses } = options;
            if (tempClasses) {
                classes += ` ${tempClasses}`;
                options.tempClasses = undefined;
            }
            if (isStructural) {
                setCacheData(elementParam, PREPARE_CLASSES_KEY, `ng-${event}${PREPARE_CLASS_SUFFIX}`);
            }
            setCacheData(elementParam, RUNNER_STORAGE_KEY, runner);
            animationQueue.push({
                element: elementParam,
                classes,
                event,
                structural: isStructural,
                options,
                beforeStart,
                close,
            });
            elementParam.addEventListener("$destroy", handleDestroyedElement);
            if (animationQueue.length > 1)
                return runner;
            $rootScope.$postUpdate(() => {
                const animations = [];
                animationQueue.forEach((entry) => {
                    if (getRunner(entry.element)) {
                        animations.push(entry);
                    }
                    else {
                        entry.close();
                    }
                });
                animationQueue.length = 0;
                const groupedAnimations = groupAnimations(animations);
                const toBeSortedAnimations = [];
                groupedAnimations.forEach((animationEntry) => {
                    const fromElement = animationEntry.from
                        ? animationEntry.from.element
                        : animationEntry.element;
                    let { addClass: extraClasses } = options;
                    extraClasses =
                        (extraClasses ? `${extraClasses} ` : "") + NG_ANIMATE_CLASSNAME;
                    const cacheKey = animateCache._cacheKey(fromElement, animationEntry.event, extraClasses, options.removeClass);
                    toBeSortedAnimations.push({
                        element: fromElement,
                        domNode: fromElement,
                        fn: function triggerAnimationStart() {
                            let startAnimationFn;
                            const closeFn = animationEntry.close;
                            if (animateCache._containsCachedAnimationWithoutDuration(cacheKey)) {
                                closeFn();
                                return;
                            }
                            animationEntry.beforeStart();
                            const targetElement = animationEntry.anchors &&
                                animationEntry.from &&
                                animationEntry.to
                                ? animationEntry.from.element || animationEntry.to.element
                                : animationEntry.element;
                            if (getRunner(targetElement)) {
                                const operation = invokeFirstDriver(animationEntry);
                                if (operation) {
                                    startAnimationFn = operation.start;
                                }
                            }
                            if (!startAnimationFn) {
                                closeFn();
                            }
                            else {
                                const animationRunner = startAnimationFn();
                                animationRunner.done((status) => {
                                    closeFn(!status);
                                });
                                updateAnimationRunners(animationEntry, animationRunner);
                            }
                        },
                        children: [],
                    });
                });
                const finalAnimations = sortAnimations(toBeSortedAnimations);
                const flatFinalAnimations = [];
                for (let i = 0; i < finalAnimations.length; i++) {
                    const innerArray = finalAnimations[i];
                    for (let j = 0; j < innerArray.length; j++) {
                        const entry = innerArray[j];
                        const { element } = entry;
                        flatFinalAnimations.push(entry.fn);
                        if (i === 0) {
                            removeElementData(element, PREPARE_CLASSES_KEY);
                            continue;
                        }
                        const prepareClassName = getCacheData(element, PREPARE_CLASSES_KEY);
                        if (prepareClassName) {
                            element.classList.add(prepareClassName);
                        }
                    }
                }
                rafScheduler._schedule(flatFinalAnimations);
            });
            return runner;
            /** Collects anchor-ref nodes for a structural animation subtree. */
            function getAnchorNodes(node) {
                const SELECTOR = `[${NG_ANIMATE_REF_ATTR}]`;
                const items = node.hasAttribute(NG_ANIMATE_REF_ATTR)
                    ? [node]
                    : node.querySelectorAll(SELECTOR);
                const anchors = [];
                items.forEach((nodeItem) => {
                    const attr = nodeItem.getAttribute(NG_ANIMATE_REF_ATTR);
                    if (attr && attr.length) {
                        anchors.push(nodeItem);
                    }
                });
                return anchors;
            }
            /** Groups paired anchor-ref animations into a single animation entry. */
            function groupAnimations(animations) {
                const preparedAnimations = [];
                const refLookup = {};
                animations.forEach((animation, index) => {
                    const { element, event: animationEvent } = animation;
                    const node = element;
                    const enterOrMove = ["enter", "move"].indexOf(animationEvent) >= 0;
                    const anchorNodes = animation.structural ? getAnchorNodes(node) : [];
                    if (anchorNodes.length) {
                        const direction = enterOrMove ? "to" : "from";
                        anchorNodes.forEach((anchor) => {
                            const key = anchor.getAttribute(NG_ANIMATE_REF_ATTR);
                            if (!key)
                                return;
                            refLookup[key] = refLookup[key] || {};
                            refLookup[key][direction] = {
                                animationID: index,
                                element: anchor,
                            };
                        });
                    }
                    else {
                        preparedAnimations.push(animation);
                    }
                });
                const usedIndicesLookup = {};
                const anchorGroups = {};
                values(refLookup).forEach((operations) => {
                    const { from, to } = operations;
                    if (!from || !to) {
                        const index = from
                            ? from.animationID
                            : to
                                ? to.animationID
                                : undefined;
                        if (index === undefined)
                            return;
                        const indexKey = index.toString();
                        if (!usedIndicesLookup[indexKey]) {
                            usedIndicesLookup[indexKey] = true;
                            preparedAnimations.push(animations[index]);
                        }
                        return;
                    }
                    const fromAnimation = animations[from.animationID];
                    const toAnimation = animations[to.animationID];
                    const lookupKey = from.animationID.toString();
                    if (!anchorGroups[lookupKey]) {
                        const group = (anchorGroups[lookupKey] = {
                            structural: true,
                            element: from.element,
                            event: fromAnimation.event,
                            options: fromAnimation.options,
                            beforeStart() {
                                fromAnimation.beforeStart();
                                toAnimation.beforeStart();
                            },
                            close() {
                                fromAnimation.close();
                                toAnimation.close();
                            },
                            classes: cssClassesIntersection(fromAnimation.classes, toAnimation.classes),
                            from: fromAnimation,
                            to: toAnimation,
                            anchors: [], // TODO(matsko): change to reference nodes
                        });
                        if ((group.classes || "").length) {
                            preparedAnimations.push(group);
                        }
                        else {
                            preparedAnimations.push(fromAnimation);
                            preparedAnimations.push(toAnimation);
                        }
                    }
                    const group = anchorGroups[lookupKey];
                    if (group?.anchors) {
                        group.anchors.push({
                            out: from.element,
                            in: to.element,
                        });
                    }
                });
                return preparedAnimations;
            }
            /** Normalizes class input into a space-delimited string. */
            function normalizeClassValue(value) {
                if (isArray(value))
                    return value.join(" ");
                return value || "";
            }
            /** Returns the shared non-`ng-` CSS classes between two class sets. */
            function cssClassesIntersection(a, b) {
                a = normalizeClassValue(a).split(" ");
                b = normalizeClassValue(b).split(" ");
                const matches = [];
                for (let i = 0; i < a.length; i++) {
                    const aa = a[i];
                    if (aa.substring(0, 3) === "ng-")
                        continue;
                    for (let j = 0; j < b.length; j++) {
                        if (aa === b[j]) {
                            matches.push(aa);
                            break;
                        }
                    }
                }
                return matches.join(" ");
            }
            /** Selects the first animation driver willing to handle a request. */
            function invokeFirstDriver(animationDetails) {
                for (let i = drivers.length - 1; i >= 0; i--) {
                    const driverName = drivers[i];
                    const factory = $injector.get(driverName);
                    const driver = factory(animationDetails);
                    if (driver) {
                        return driver;
                    }
                }
                return undefined;
            }
            function beforeStart() {
                tempClasses =
                    (tempClasses ? `${tempClasses} ` : "") + NG_ANIMATE_CLASSNAME;
                elementParam.className += ` ${tempClasses}`;
                let prepareClassName = getCacheData(elementParam, PREPARE_CLASSES_KEY);
                if (prepareClassName) {
                    elementParam.classList.remove(prepareClassName);
                    prepareClassName = null;
                }
            }
            /** Rebinds any existing element runners to a newly created host runner. */
            function updateAnimationRunners(animation, newRunner) {
                if (animation.from && animation.to) {
                    update(animation.from.element);
                    update(animation.to.element);
                }
                else {
                    update(animation.element);
                }
                /** Updates the host runner associated with a single element. */
                function update(el) {
                    getRunner(el)?.setHost(newRunner);
                }
            }
            function handleDestroyedElement() {
                (event !== "leave" || !options._domOperationFired) &&
                    getRunner(elementParam)?.end();
            }
            /** Finalizes the animation and applies DOM/class/style cleanup. */
            function close(rejected) {
                deleteCacheData(elementParam, RUNNER_STORAGE_KEY);
                applyAnimationClasses(elementParam, options);
                applyAnimationStyles(elementParam, options);
                options.domOperation?.();
                if (tempClasses) {
                    const classList = isArray(tempClasses)
                        ? tempClasses
                        : tempClasses.split(" ");
                    classList.forEach((cls) => elementParam.classList.remove(cls));
                }
                runner.complete(!rejected);
            }
        };
    }
}

export { AnimationProvider };
