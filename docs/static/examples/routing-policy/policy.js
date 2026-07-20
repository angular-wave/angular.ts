window.routingPolicyToken = null;
window.routingPolicyPermissions = [];

const routingPolicyDemo = window.angular
  .module('routingPolicyDemo', [])
  .config({
    $security: {
      fallback: 'allow',
      isAuthenticated: function isRoutingPolicyDemoAuthenticated() {
        return window.routingPolicyToken !== null;
      },
      credentials: {
        bearer: function getRoutingPolicyDemoToken() {
          return window.routingPolicyToken;
        },
      },
      permissions: function authorizeRoutingPolicy(permission) {
        return window.routingPolicyPermissions.includes(permission);
      },
    },
  })
  .router({
    name: 'login',
    template: '<h1>Login required</h1>',
  })
  .router({
    name: 'forbidden',
    template: '<h1>Permission required</h1>',
  })
  .router({
    name: 'admin',
    abstract: true,
    template: '<section><h1>Admin</h1><ng-view></ng-view></section>',
    policy: {
      navigation: {
        authenticated: true,
        redirectTo: 'login',
      },
    },
    children: [
      {
        name: 'users',
        template: '<h2>Users loaded</h2>',
      },
      {
        name: 'help',
        template: '<h2>Public help loaded</h2>',
        policy: {
          navigation: {
            public: true,
          },
        },
      },
      {
        name: 'roles',
        template: '<h2>Roles loaded</h2>',
        policy: {
          navigation: {
            permissions: 'admin:roles',
            redirectTo: 'forbidden',
          },
        },
      },
    ],
  });

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('routing-policy-app');
  const currentState = document.getElementById('current-state');
  const lastResult = document.getElementById('last-result');
  const injector = window.angular.bootstrap(root, [routingPolicyDemo.name]);
  const $state = injector.get('$state');

  function updateStatus(result) {
    currentState.textContent = $state.current.name || 'none';
    lastResult.textContent = result;
  }

  async function navigate(name) {
    updateStatus('requested ' + name);

    try {
      await $state.go(name, {}, { location: false });
      updateStatus('entered ' + ($state.current.name || 'none'));
    } catch (error) {
      const reason =
        error && typeof error === 'object' && 'message' in error
          ? error.message
          : String(error);
      updateStatus('blocked ' + name + ': ' + reason);
    }
  }

  root.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => {
      void navigate(button.getAttribute('data-route'));
    });
  });

  document.getElementById('sign-in').addEventListener('click', () => {
    window.routingPolicyToken = 'demo-token';
    updateStatus('signed in');
  });

  document.getElementById('grant-roles').addEventListener('click', () => {
    window.routingPolicyPermissions = ['admin:roles'];
    updateStatus('roles granted');
  });
});
