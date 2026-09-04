---
title: Create the application
description:
  Install AngularTS, define the application module, and bootstrap the page.
weight: 10
---

## Before you start

Use a current Node.js release and an application bundler that supports
TypeScript and browser ESM.

## Install

```bash
npm install @angular-wave/angular.ts
```

Create the application entrypoint:

```ts
import { angular } from '@angular-wave/angular.ts';

export const app = angular.createModule('taskBoard', []);
angular.bootstrap(document, ['taskBoard']);
```

Create the host page:

```html
<!doctype html>
<html lang="en">
  <body>
    <task-board></task-board>
    <script type="module" src="/src/app.ts"></script>
  </body>
</html>
```

## Checkpoint

Start the development server. The page should load without a bootstrap or
missing-module error. The custom element is empty until the next step.

## Next step

[Add the optional typed component view used by this tutorial](../typed-view/).
