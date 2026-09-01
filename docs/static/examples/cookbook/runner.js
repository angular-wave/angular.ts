class UploadController {
  files = null;
  error = undefined;

  send() {}

  cancel() {}
}

angular
  .createModule('cookbookExamples', [])
  .model('cart', () => ({
    items: [],
    currency: 'EUR',
  }))
  .controller('CartSummary', [
    'cart',
    function CartSummary(cart) {
      this.cart = cart;
    },
  ])
  .controller('UploadController', UploadController);
