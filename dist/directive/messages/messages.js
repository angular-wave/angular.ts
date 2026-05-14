import { _injector, _parse, _templateRequest, _compile } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { createNodelistFromHTML, removeElement } from '../../shared/dom.js';
import { isString, values, entries, assertDefined, deleteProperty, isInstanceOf, isArray, hasOwn } from '../../shared/utils.js';

const ACTIVE_CLASS = "ng-active";
const INACTIVE_CLASS = "ng-inactive";
class NgMessageCtrl {
    /**
     * Creates a controller that manages message matching and attachment state.
     */
    constructor($element, $scope, $attrs, getAnimate, $parse) {
        this._element = $element;
        this._scope = $scope;
        this._attrs = $attrs;
        this._getAnimate = getAnimate;
        this._isAnimated = !!getAnimateForNode(getAnimate, $element);
        this._latestKey = 0;
        this._nextAttachId = 0;
        this._messages = {};
        this._renderLater = false;
        this._cachedCollection = null;
        this._default = undefined;
        this._multipleExpression = parseAttrTruthy($parse, this._attrs.multiple);
        this._ngMessagesMultipleExpression = parseAttrTruthy($parse, this._attrs.ngMessagesMultiple);
        this._scope.$watch(this._attrs.ngMessages || this._attrs.for, this._render.bind(this));
    }
    /** @internal */
    _getAttachId() {
        return this._nextAttachId++;
    }
    /** @internal */
    _render(collection = {}) {
        collection = collection || {};
        this._renderLater = false;
        this._cachedCollection = collection;
        const multiple = evalAttrTruthy(this._scope, this._ngMessagesMultipleExpression) ||
            evalAttrTruthy(this._scope, this._multipleExpression);
        const unmatchedMessages = [];
        const matchedKeys = {};
        let truthyKeys = 0;
        const messageItems = values(this._messages).sort((a, b) => {
            const position = a.comment.compareDocumentPosition(b.comment);
            return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        let messageFound = false;
        let totalMessages = 0;
        messageItems.forEach((messageItem) => {
            totalMessages++;
            const messageCtrl = messageItem.message;
            let messageUsed = false;
            if (!messageFound) {
                entries(collection).forEach(([key, value]) => {
                    if (truthy(value) && !messageUsed) {
                        truthyKeys++;
                        if (messageCtrl.test(key)) {
                            if (matchedKeys[key])
                                return;
                            matchedKeys[key] = true;
                            messageUsed = true;
                            messageCtrl.attach();
                        }
                    }
                });
            }
            if (messageUsed) {
                messageFound = !multiple;
            }
            else {
                unmatchedMessages.push(messageCtrl);
            }
        });
        unmatchedMessages.forEach((messageCtrl) => {
            messageCtrl.detach();
        });
        const messageMatched = unmatchedMessages.length !== totalMessages;
        const attachDefault = !!this._default && !messageMatched && truthyKeys > 0;
        if (attachDefault) {
            assertDefined(this._default).attach();
        }
        else if (this._default) {
            this._default.detach();
        }
        if (messageMatched || attachDefault) {
            if (this._isAnimated) {
                this._getAnimate().setClass(this._element, ACTIVE_CLASS, INACTIVE_CLASS);
            }
            else {
                this._element.classList.add(ACTIVE_CLASS);
                this._element.classList.remove(INACTIVE_CLASS);
            }
        }
        else {
            if (this._isAnimated) {
                this._getAnimate().setClass(this._element, INACTIVE_CLASS, ACTIVE_CLASS);
            }
            else {
                this._element.classList.add(INACTIVE_CLASS);
                this._element.classList.remove(ACTIVE_CLASS);
            }
        }
    }
    reRender() {
        if (!this._renderLater) {
            this._renderLater = true;
            void Promise.resolve().then(() => {
                if (this._renderLater) {
                    this._render(this._cachedCollection ?? {});
                }
            });
        }
    }
    /**
     * Registers a message instance with the controller.
     */
    register(comment, messageCtrl, isDefault) {
        if (isDefault) {
            this._default = messageCtrl;
        }
        else {
            const nextKey = this._latestKey.toString();
            this._messages[nextKey] = {
                message: messageCtrl,
                comment,
            };
            comment._ngMessageNode = nextKey;
            this._latestKey++;
        }
        this.reRender();
    }
    /**
     * Deregisters a message instance from the controller.
     */
    deregister(comment, isDefault) {
        if (isDefault) {
            delete this._default;
        }
        else {
            const key = comment._ngMessageNode;
            delete comment._ngMessageNode;
            if (key) {
                deleteProperty(this._messages, key);
            }
        }
        this.reRender();
    }
}
ngMessagesDirective.$inject = [_injector, _parse];
/**
 * Builds the root `ngMessages` directive.
 */
function ngMessagesDirective($injector, $parse) {
    const getAnimate = createLazyAnimate($injector);
    return {
        require: "ngMessages",
        restrict: "AE",
        controller: ($element, $scope, $attrs) => new NgMessageCtrl($element, $scope, $attrs, getAnimate, $parse),
    };
}
/**
 * Evaluates whether an `ngMessages` boolean-style attribute should be treated as enabled.
 */
function parseAttrTruthy($parse, attr) {
    if (!isString(attr))
        return undefined;
    return attr.length === 0 ? true : $parse(attr);
}
function evalAttrTruthy(scope, expr) {
    return expr === true || truthy(expr?.(scope));
}
/**
 * Normalizes message values into a simple truthy check.
 */
function truthy(val) {
    return isString(val) ? val.length > 0 : !!val;
}
ngMessagesIncludeDirective.$inject = [_templateRequest, _compile];
/**
 * Builds the directive that inlines external message templates.
 */
function ngMessagesIncludeDirective($templateRequest, $compile) {
    return {
        restrict: "AE",
        require: "^^ngMessages", // we only require this for validation sake
        link($scope, element, attrs, ngMessagesCtrl) {
            const src = attrs.ngMessagesInclude || attrs.src;
            void $templateRequest(src).then((html) => {
                if ($scope._destroyed)
                    return;
                if (isString(html) && !html.trim()) ;
                else {
                    // Non-empty template - compile and link
                    $compile(createNodelistFromHTML(html))($scope, insertCompiledMessageTemplate(element));
                    ngMessagesCtrl.reRender();
                }
            });
        },
    };
}
function insertCompiledMessageTemplate(anchor) {
    return (contents) => {
        if (!contents) {
            return;
        }
        const nodes = isInstanceOf(contents, Node)
            ? [contents]
            : isArray(contents)
                ? contents
                : Array.from(contents);
        for (let i = nodes.length - 1; i >= 0; i--) {
            anchor.after(nodes[i]);
        }
    };
}
const ngMessageDirective = ngMessageDirectiveFactory(false);
const ngMessageExpDirective = ngMessageDirectiveFactory(false);
const ngMessageDefaultDirective = ngMessageDirectiveFactory(true);
/**
 * Creates the directive factory for `ngMessage` and `ngMessageDefault`.
 */
function ngMessageDirectiveFactory(isDefault) {
    ngMessageDirectiveFn.$inject = [_injector, _parse];
    /**
     * Builds a concrete `ngMessage` directive definition.
     */
    function ngMessageDirectiveFn($injector, $parse) {
        const getAnimate = createLazyAnimate($injector);
        return {
            restrict: "AE",
            transclude: "element",
            priority: 1, // must run before ngBind, otherwise the text is set on the comment
            terminal: true,
            require: "^^ngMessages",
            link: (scope, element, attrs, ngMessagesCtrl, $transclude) => {
                let commentNode = element;
                let records = null;
                let staticExp;
                let dynamicExp;
                if (!isDefault) {
                    commentNode = element;
                    staticExp = attrs.ngMessage || attrs.when;
                    dynamicExp = attrs.ngMessageExp || attrs.whenExp;
                    const assignRecords = function (items) {
                        records = items
                            ? isArray(items)
                                ? items
                                : items.split(/[\s,]+/)
                            : null;
                        ngMessagesCtrl.reRender();
                    };
                    if (dynamicExp) {
                        const dynamicFn = $parse(dynamicExp);
                        assignRecords(dynamicFn(scope));
                        scope.$watch(dynamicExp, assignRecords);
                    }
                    else {
                        assignRecords(staticExp);
                    }
                }
                /** @internal */
                let currentElement = null;
                let messageCtrl;
                ngMessagesCtrl.register(commentNode, (messageCtrl = {
                    test(name) {
                        return contains(records, name);
                    },
                    attach() {
                        if (!currentElement) {
                            $transclude((elm, newScope) => {
                                const transcludedElement = elm;
                                const animate = getAnimateForNode(getAnimate, transcludedElement);
                                if (animate) {
                                    animate.enter(transcludedElement, null, element);
                                }
                                else {
                                    element.after(transcludedElement);
                                }
                                currentElement = transcludedElement;
                                // Each time we attach this node to a message we get a new id that we can match
                                // when we are destroying the node later.
                                const attachId = (currentElement._attachId =
                                    ngMessagesCtrl._getAttachId());
                                // in the event that the element or a parent element is destroyed
                                // by another structural directive then it's time
                                // to deregister the message from the controller
                                currentElement.addEventListener("$destroy", () => {
                                    // If the message element was removed via a call to `detach` then `currentElement` will be null
                                    // So this handler only handles cases where something else removed the message element.
                                    if (currentElement?._attachId === attachId) {
                                        ngMessagesCtrl.deregister(commentNode, isDefault);
                                        messageCtrl.detach();
                                    }
                                    newScope?.$destroy();
                                });
                            });
                        }
                    },
                    detach() {
                        if (currentElement) {
                            const elm = currentElement;
                            currentElement = null;
                            const animate = getAnimateForNode(getAnimate, elm);
                            if (animate) {
                                animate.leave(elm);
                            }
                            else {
                                removeElement(elm);
                            }
                        }
                    },
                }), isDefault);
                // We need to ensure that this directive deregisters itself when it no longer exists
                // Normally this is done when the attached element is destroyed; but if this directive
                // gets removed before we attach the message to the DOM there is nothing to watch
                // in which case we must deregister when the containing scope is destroyed.
                scope.$on("$destroy", () => {
                    ngMessagesCtrl.deregister(commentNode, isDefault);
                });
            },
        };
    }
    return ngMessageDirectiveFn;
}
/**
 * Checks whether the given key exists in a message collection.
 */
function contains(collection, key) {
    if (collection) {
        return isArray(collection)
            ? collection.includes(String(key))
            : hasOwn(collection, key);
    }
    return undefined;
}

export { ngMessageDefaultDirective, ngMessageDirective, ngMessageExpDirective, ngMessagesDirective, ngMessagesIncludeDirective };
