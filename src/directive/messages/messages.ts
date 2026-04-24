import { $injectTokens } from "../../injection-tokens.ts";
import {
  entries,
  hasOwn,
  isArray,
  isInstanceOf,
  isString,
  values,
} from "../../shared/utils.ts";

const ACTIVE_CLASS = "ng-active";

const INACTIVE_CLASS = "ng-inactive";

type MessageCollection = Record<string, any>;

/** @internal */
type MessageNodeComment = Comment & { _ngMessageNode?: string };

type LinkedMessageCtrl = {
  message: MessageInstance;
  comment: MessageNodeComment;
};

type MessageInstance = {
  attach: () => void;
  detach: () => void;
  test: (name: string | number | symbol) => boolean | undefined;
};

class NgMessageCtrl {
  /** @internal */
  _element: HTMLElement;
  /** @internal */
  _scope: ng.Scope;
  /** @internal */
  _attrs: ng.Attributes;
  /** @internal */
  _animate: ng.AnimateService;
  /** @internal */
  _latestKey: number;
  /** @internal */
  _nextAttachId: number;
  /** @internal */
  _messages: Record<string, LinkedMessageCtrl>;
  /** @internal */
  _renderLater: boolean;
  /** @internal */
  _cachedCollection: MessageCollection | null;
  /** @internal */
  _default: MessageInstance | undefined;

  /**
   * Creates a controller that manages message matching and attachment state.
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
    this._messages = {};
    this._renderLater = false;
    this._cachedCollection = null;

    this._default = undefined;

    this._scope.$watch(
      this._attrs.ngMessages || this._attrs.for,
      this._render.bind(this),
    );
  }

  /** @internal */
  _getAttachId(): number {
    return this._nextAttachId++;
  }

  /** @internal */
  _render(collection: MessageCollection = {}): void {
    this._renderLater = false;
    this._cachedCollection = collection;

    const multiple =
      isAttrTruthy(this._scope, this._attrs.ngMessagesMultiple) ||
      isAttrTruthy(this._scope, this._attrs.multiple);

    const unmatchedMessages: MessageInstance[] = [];

    const matchedKeys: Record<string, boolean> = {};

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
    });

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
        if (this._renderLater) {
          this._render(this._cachedCollection ?? {});
        }
      });
    }
  }

  /**
   * Registers a message instance with the controller.
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
  deregister(comment: MessageNodeComment, isDefault: boolean): void {
    if (isDefault) {
      delete this._default;
    } else {
      const key = comment._ngMessageNode;

      delete comment._ngMessageNode;

      if (key) {
        delete this._messages[key];
      }
    }
    this.reRender();
  }
}

ngMessagesDirective.$inject = [$injectTokens._animate];
/**
 * Builds the root `ngMessages` directive.
 */
export function ngMessagesDirective(
  $animate: ng.AnimateService,
): ng.Directive<NgMessageCtrl> {
  return {
    require: "ngMessages",
    restrict: "AE",
    controller: (
      $element: HTMLElement,
      $scope: ng.Scope,
      $attrs: ng.Attributes,
    ) => new NgMessageCtrl($element, $scope, $attrs, $animate),
  };
}

/**
 * Evaluates whether an `ngMessages` boolean-style attribute should be treated as enabled.
 */
function isAttrTruthy(scope: ng.Scope, attr: string | undefined): boolean {
  return (
    (isString(attr) && attr.length === 0) || // empty attribute
    truthy(attr && scope.$eval(attr))
  );
}

/**
 * Normalizes message values into a simple truthy check.
 */
function truthy(val: unknown): boolean {
  return isString(val) ? val.length > 0 : !!val;
}

ngMessagesIncludeDirective.$inject = [
  $injectTokens._templateRequest,
  $injectTokens._compile,
];

/**
 * Builds the directive that inlines external message templates.
 */
export function ngMessagesIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $compile: ng.CompileService,
): ng.Directive {
  return {
    restrict: "AE",
    require: "^^ngMessages", // we only require this for validation sake
    link(
      $scope: ng.Scope,
      element: Element,
      attrs: ng.Attributes,
      ngMessagesCtrl: NgMessageCtrl,
    ) {
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

          ngMessagesCtrl.reRender();
        }
      });
    },
  };
}

export const ngMessageDirective = ngMessageDirectiveFactory(false);
export const ngMessageExpDirective = ngMessageDirectiveFactory(false);
export const ngMessageDefaultDirective = ngMessageDirectiveFactory(true);

/**
 * Creates the directive factory for `ngMessage` and `ngMessageDefault`.
 */
function ngMessageDirectiveFactory(
  isDefault: boolean,
): ($animate: ng.AnimateService) => ng.Directive<any> {
  ngMessageDirectiveFn.$inject = [$injectTokens._animate];
  /**
   * Builds a concrete `ngMessage` directive definition.
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
        let commentNode = element as unknown as MessageNodeComment;

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

        /** @internal */
        let currentElement: (HTMLElement & { _attachId?: number }) | null =
          null;

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
                    /** @internal */
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
 * Checks whether the given key exists in a message collection.
 */
function contains(
  collection: string[] | object | Array<any> | null | undefined,
  key: string | number | symbol,
): boolean | undefined {
  if (collection) {
    return isArray(collection)
      ? collection.indexOf(String(key)) >= 0
      : hasOwn(collection, key);
  }

  return undefined;
}
