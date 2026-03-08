/**
 * Subscribes an element to a pub/sub channel.
 *
 * If the element has inline template content, published object payloads are
 * merged into the current scope. Otherwise, string payloads replace the
 * element's HTML content directly.
 *
 * @param {ng.PubSubService} $eventBus
 */
export declare function ngChannelDirective(
  $eventBus: ng.PubSubService,
): ng.Directive;
export declare namespace ngChannelDirective {
  var $inject: "$eventBus"[];
}
