window.angular
  .module('modelDemo', [])
  .model('user', () => ({
    name: 'John',
    authenticated: false,
  }))
  .model('cart', () => ({
    items: ['starter'],
  }))
  .controller(
    'ProfileCtrl',
    class {
      static $inject = ['user', 'cart'];

      constructor(user, cart) {
        this.user = user;
        this.cart = cart;
      }

      signIn() {
        this.user.authenticated = true;
        this.cart.items.push('welcome');
      }

      reset() {
        this.user.name = 'John';
        this.user.authenticated = false;
        this.cart.items = ['starter'];
      }
    },
  )
  .controller(
    'HeaderCtrl',
    class {
      static $inject = ['user', 'cart'];

      constructor(user, cart) {
        this.user = user;
        this.cart = cart;
      }
    },
  );
