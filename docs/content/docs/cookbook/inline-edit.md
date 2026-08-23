---
title: Edit a server record in place
description:
  Load an editor, submit JSON, and keep server validation beside the field
weight: 22
---

## Problem

A user should edit one record without leaving the page. The server owns
validation and returns the saved record.

## Before you start

The page already has the record ID and summary. The endpoint accepts JSON and
returns field errors with status `422`.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<article
  ng-init='profile = {"id":42,"name":"Ada"}; editing = false; errors = {}'
>
  <p ng-if="!editing">{{ profile.name }}</p>
  <button ng-if="!editing" ng-click="editing = true">Edit name</button>

  <form
    ng-if="editing"
    ng-put="/api/profiles/{{ profile.id }}"
    on-success="profile = $res; editing = false; errors = {}"
    on-error="errors = $res"
  >
    <input name="name" ng-model="profile.name" required />
    <span ng-if="errors.name">{{ errors.name }}</span>
    <button type="submit">Save</button>
    <button type="button" ng-click="editing = false">Cancel</button>
  </form>
</article>
```

## Server contract

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```text
PUT /api/profiles/42
Content-Type: application/json

{"name":"Ada Lovelace"}

HTTP/1.1 422 Unprocessable Content
Content-Type: application/json

{"name":"That name is already used"}
```

## What AngularTS wires

The form creates JSON from named controls. A `2xx` response replaces `profile`;
a `4xx` response becomes `$res` and stays beside the editor.

## Failure path

Keep the editor open after validation or network failure. Do not replace the
user's input with the old server value until they cancel.

## Apply it now

Choose one record users currently open on another page just to change one or two
fields. Define its update URL, successful JSON body, and one realistic `422`
body.

## Verify

Edit, reject, correct, and save the record. Confirm focus and entered values
survive the rejected request and the final summary uses the server response.
