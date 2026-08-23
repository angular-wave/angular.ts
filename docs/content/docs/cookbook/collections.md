---
title: Keep repeated rows stable
description: Preserve row DOM when refreshed data represents the same records
weight: 103
---

## Problem

Refreshing a collection replaces every object. `ng-repeat` then rebuilds rows,
which loses focus, selection, local element state, and animation continuity.

## Recipe

Reconcile incoming records with the existing objects before replacing the
collection.

```ts
interface User {
  id: string;
  name: string;
}

function reconcileUsers(current: User[], incoming: User[]): User[] {
  const existing = new Map(current.map((user) => [user.id, user]));

  return incoming.map((next) => {
    const user = existing.get(next.id);

    if (!user) {
      return next;
    }

    Object.assign(user, next);
    return user;
  });
}
```

Use the reconciled array after a refresh:

```ts
controller.users = reconcileUsers(controller.users, response.data);
```

Render it normally:

```html
<ul>
  <li ng-repeat="user in users">
    <input ng-model="user.name" />
  </li>
</ul>
```

## Why this works

`ng-repeat` tracks objects by identity. Reusing the object for the same `id`
lets AngularTS reuse that row. New records get new rows, removed records lose
their rows, and existing records keep their DOM.

The server ID decides which record is the same. The repeat directive still uses
its built-in identity behavior.

## Verify

1. Focus an input in one row.
2. Refresh the collection with new objects carrying the same IDs.
3. Confirm focus stays in that row.
4. Add and remove records and confirm only those rows change.

## Avoid

Do not reconcile records that have no stable identity. Do not reuse an object
when the server ID changed. For small primitive arrays where row state does not
matter, replacing the collection is simpler.
