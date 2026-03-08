import { $injectTokens } from "../../injection-tokens.ts";
import {
  entries,
  hasOwn,
  isArray,
  isInstanceOf,
  isString,
} from "../../shared/utils.ts";

const ACTIVE_CLASS = "ng-active";

const INACTIVE_CLASS = "ng-inactive";

type MessageCollection = Record<string, any>;
type MessageNodeComment = Comment & { _ngMessageNode?: string };
type LinkedMessageCtrl = {
  message: MessageInstance;
  next?: LinkedMessageCtrl;
};
type MessageInstance = {
  attach: () => void;
  detach: () => void;
  test: (name: string | number | symbol) => boolean | undefined;
};

class NgMessageCtrl {
  _element: HTMLElement;
  _scope: ng.Scope;
  _attrs: ng.Attributes;
  _animate: ng.AnimateService;
  _latestKey: number;
  _nextAttachId: number;
  _messages: Record<string, LinkedMessageCtrl>;
  _renderLater: boolean;
  _cachedCollection: MessageCollection | null;
  _head: LinkedMessageCtrl | undefined;
  _default: MessageInstance | undefined;

  /**
   * @param {HTMLElement} $element
   * @param {ng.Scope} $scope
   * @param {ng.Attributes} $attrs
   * @param {ng.AnimateService} $animate
   */
  constructor(
    $element: HTMLElement,
    $scope: ng.Scope,
    $attrs: ng.Attributes,
    $animate: ng.AnimateService,
  ) {
    this._element = $element;
    this._scope = $scope;
    this._attrs = $attrs;
    this._animate = $animate;

    this._latestKey = 0;
    this._nextAttachId = 0;
    /** @type {Record<string, any>} */
    this._messages = {};
    this._renderLater = false;
    this._cachedCollection = null;

    this._head = undefined;
    this._default = undefined;

    this._scope.$watch(
      this._attrs.ngMessages || this._attrs.for,
      this._render.bind(this),
    );
  }

  _getAttachId(): number {
    return this._nextAttachId++;
  }

  _render(collection: MessageCollection = {}): void {
    this._renderLater = false;
    this._cachedCollection = collection;

    const multiple =
      isAttrTruthy(this._scope, this._attrs.ngMessagesMultiple) ||
      isAttrTruthy(this._scope, this._attrs.multiple);

    const unmatchedMessages: MessageInstance[] = [];

    const matchedKeys: Record<string, boolean> = {};

    let truthyKeys = 0;

    let messageItem = this._head;

    let messageFound = false;

    let totalMessages = 0;

    while (messageItem) {
      totalMessages++;
      const messageCtrl = messageItem.message;

      let messageUsed = false;

      if (!messageFound) {
        entries(collection).forEach(([key, value]) => {
          if (truthy(value) && !messageUsed) {
            truthyKeys++;

            if (messageCtrl.test(key)) {
              if (matchedKeys[key]) return;
              matchedKeys[key] = true;

              messageUsed = true;
              messageCtrl.attach();
            }
          }
        });
      }

      if (messageUsed) {
        messageFound = !multiple;
      } else {
        unmatchedMessages.push(messageCtrl);
      }

      messageItem = messageItem.next;
    }

    unmatchedMessages.forEach((messageCtrl) => {
      messageCtrl.detach();
    });

    const messageMatched = unmatchedMessages.length !== totalMessages;

    const attachDefault = !!this._default && !messageMatched && truthyKeys > 0;

    if (attachDefault) {
      this._default!.attach();
    } else if (this._default) {
      this._default.detach();
    }

    if (messageMatched || attachDefault) {
      this._animate.setClass(this._element, ACTIVE_CLASS, INACTIVE_CLASS);
    } else {
      this._animate.setClass(this._element, INACTIVE_CLASS, ACTIVE_CLASS);
    }
  }

  reRender(): void {
    if (!this._renderLater) {
      this._renderLater = true;
      Promise.resolve().then(() => {
        if (this._renderLater && this._cachedCollection) {
          this._render(this._cachedCollection);
        }
      });
    }
  }

  /**
   * @param {{ _ngMessageNode: string; }} comment
   * @param {any} messageCtrl
   * @param {any} isDefault
   */
  register(
    comment: MessageNodeComment,
    messageCtrl: MessageInstance,
    isDefault: boolean,
  ): void {
    if (isDefault) {
      this._default = messageCtrl;
    } else {
      const nextKey = this._latestKey.toString();

      this._messages[nextKey] = {
        message: messageCtrl,
      };
      this.insertMessageNode(this._element, comment, nextKey);
      comment._ngMessageNode = nextKey;
      this._latestKey++;
    }

    this.reRender();
  }

  /**
   * @param {{ _ngMessageNode: any; }} comment
   * @param {any} isDefault
   */
  deregister(comment: MessageNodeComment, isDefault: boolean): void {
    if (isDefault) {
      delete this._default;
    } else {
      const key = comment._ngMessageNode;

      delete comment._ngMessageNode;
      if (key) {
        this.removeMessageNode(this._element, comment, key);
        delete this._messages[key];
      }
    }
    this.reRender();
  }

  /**
   * @param {any} parent
   * @param {any} comment
   */
  findPreviousMessage(
    parent: Node,
    comment: Node & { _ngMessageNode?: string },
  ): LinkedMessageCtrl | undefined {
    let prevNode: (Node & { _ngMessageNode?: string }) | null = comment;

    const parentLookup: Node[] = [];

    while (prevNode && prevNode !== parent) {
      const prevKey = prevNode._ngMessageNode;

      if (prevKey && prevKey.length) {
        return this._messages[prevKey];
      }

      if (prevNode.childNodes.length && parentLookup.indexOf(prevNode) === -1) {
        parentLookup.push(prevNode);
        prevNode = prevNode.childNodes[prevNode.childNodes.length - 1];
      } else if (prevNode.previousSibling) {
        prevNode = prevNode.previousSibling;
      } else {
        prevNode = prevNode.parentNode as
          | (Node & { _ngMessageNode?: string })
          | null;
        if (prevNode) {
          parentLookup.push(prevNode);
        }
      }
    }

    return undefined;
  }

  /**
   * @param {HTMLElement} parent
   * @param {{ _ngMessageNode: string; }} comment
   * @param {string} key
   */
  insertMessageNode(
    parent: HTMLElement,
    comment: MessageNodeComment,
    key: string,
  ): void {
    void parent;
    const messageNode = this._messages[key];

    if (!this._head) {
      this._head = messageNode;
    } else {
      const match = this.findPreviousMessage(parent, comment);

      if (match) {
        messageNode.next = match.next;
        match.next = messageNode;
      } else {
        messageNode.next = this._head;
        this._head = messageNode;
      }
    }
  }

  /**
   * @param {HTMLElement} parent
   * @param {{ _ngMessageNode: any; }} comment
   * @param {string | number} key
   */
  removeMessageNode(
    parent: HTMLElement,
    comment: MessageNodeComment,
    key: string | number,
  ): void {
    void parent;
    const messageNode = this._messages[key];

    if (!messageNode) return;

    const match = this.findPreviousMessage(parent, comment);

    if (match) {
      match.next = messageNode.next;
    } else {
      this._head = messageNode.next;
    }
  }
}

ngMessagesDirective.$inject = [$injectTokens._animate];
/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive<NgMessageCtrl>}
 */
export function ngMessagesDirective(
  $animate: ng.AnimateService,
): ng.Directive<NgMessageCtrl> {
  return {
    require: "ngMessages",
    restrict: "AE",
    controller:
      /**
       * @param {HTMLElement} $element
       * @param {ng.Scope} $scope
       * @param {ng.Attributes} $attrs
       * @returns {NgMessageCtrl}
       */
      ($element: HTMLElement, $scope: ng.Scope, $attrs: ng.Attributes) =>
        new NgMessageCtrl($element, $scope, $attrs, $animate),
  };
}

/**
 * @param {ng.Scope} scope
 * @param {string} attr
 */
function isAttrTruthy(scope: ng.Scope, attr: string | undefined): boolean {
  return (
    (isString(attr) && attr.length === 0) || // empty attribute
    truthy(attr && scope.$eval(attr))
  );
}

/**
 * @param {unknown} val
 */
function truthy(val: unknown): boolean {
  return isString(val) ? val.length > 0 : !!val;
}

ngMessagesIncludeDirective.$inject = [
  $injectTokens._templateRequest,
  $injectTokens._compile,
];

/**
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {ng.CompileService} $compile
 * @returns {ng.Directive}
 */
export function ngMessagesIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $compile: ng.CompileService,
): ng.Directive<any> {
  return {
    restrict: "AE",
    require: "^^ngMessages", // we only require this for validation sake
    link($scope: ng.Scope, element: Element, attrs: ng.Attributes) {
      const src = attrs.ngMessagesInclude || attrs.src;

      $templateRequest(src).then((html: string) => {
        if ($scope._destroyed) return;

        if (isString(html) && !html.trim()) {
          // Empty template - nothing to compile
        } else {
          // Non-empty template - compile and link
          $compile(html)($scope, ((
            contents?: Node | Element | Node[] | NodeList | null,
          ) => {
            isInstanceOf(contents, Node) && element.after(contents);
          }) as (contents?: Node | Element | Node[] | NodeList | null) => void);
        }
      });
    },
  };
}

export const ngMessageDirective = ngMessageDirectiveFactory(false);
export const ngMessageExpDirective = ngMessageDirectiveFactory(false);
export const ngMessageDefaultDirective = ngMessageDirectiveFactory(true);

/**
 * @param {boolean} isDefault
 * @returns {($animate: ng.AnimateService) => ng.Directive}
 */
function ngMessageDirectiveFactory(
  isDefault: boolean,
): ($animate: ng.AnimateService) => ng.Directive<any> {
  ngMessageDirectiveFn.$inject = [$injectTokens._animate];
  /**
   * @param {ng.AnimateService} $animate
   * @returns {ng.Directive}
   */
  function ngMessageDirectiveFn(
    $animate: ng.AnimateService,
  ): ng.Directive<any> {
    return {
      restrict: "AE",
      transclude: "element",
      priority: 1, // must run before ngBind, otherwise the text is set on the comment
      terminal: true,
      require: "^^ngMessages",
      link: (
        scope: ng.Scope,
        element: HTMLElement,
        attrs: ng.Attributes,
        ngMessagesCtrl: NgMessageCtrl,
        $transclude: ng.TranscludeFn,
      ) => {
        /**
         * @type {HTMLElement}
         */
        let commentNode = element as unknown as MessageNodeComment;

        /**
         * @type {any}
         */
        let records: string[] | null = null;

        let staticExp: string | undefined;

        let dynamicExp: string | undefined;

        if (!isDefault) {
          commentNode = element as unknown as MessageNodeComment;
          staticExp = attrs.ngMessage || attrs.when;
          dynamicExp = attrs.ngMessageExp || attrs.whenExp;

          const assignRecords = function (
            items: string | string[] | undefined,
          ) {
            records = items
              ? isArray(items)
                ? items
                : items.split(/[\s,]+/)
              : null;
            ngMessagesCtrl.reRender();
          };

          if (dynamicExp) {
            assignRecords(scope.$eval(dynamicExp));
            scope.$watch(dynamicExp, assignRecords);
          } else {
            assignRecords(staticExp);
          }
        }

        /**
         * @type {HTMLElement & { _attachId?: number } | undefined | null}
         */
        let currentElement: (HTMLElement & { _attachId?: number }) | null =
          null;

        /**
         * @type {{ detach: any; test?: (name: any) => boolean | undefined; attach?: () => void; }}
         */
        let messageCtrl: MessageInstance;

        ngMessagesCtrl.register(
          commentNode,
          (messageCtrl = {
            test(name: string | number | symbol) {
              return contains(records, name);
            },
            attach() {
              if (!currentElement) {
                $transclude((elm, newScope) => {
                  const transcludedElement = elm as HTMLElement & {
                    _attachId?: number;
                  };

                  $animate.enter(transcludedElement, null, element);
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
                    if (
                      currentElement &&
                      currentElement._attachId === attachId
                    ) {
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
                $animate.leave(elm);
              }
            },
          }),
          isDefault,
        );

        // We need to ensure that this directive deregisters itself when it no longer exists
        // Normally this is done when the attached element is destroyed; but if this directive
        // gets removed before we attach the message to the DOM there is nothing to watch
        // in which case we must deregister when the containing scope is destroyed.
        scope.$on("$destroy", () => {
          ngMessagesCtrl.deregister(commentNode, isDefault);
        });
      },
    } as unknown as ng.Directive<any>;
  }

  return ngMessageDirectiveFn;
}

/**
 * @param {string | object | Array<any>} collection
 * @param {string | number | symbol} key
 */
function contains(
  collection: string[] | object | Array<any> | null | undefined,
  key: string | number | symbol,
): boolean | undefined {
  if (collection) {
    return isArray(collection)
      ? collection.indexOf(String(key)) >= 0
      : hasOwn(/** @type {object} */ collection, key);
  }

  return undefined;
}
