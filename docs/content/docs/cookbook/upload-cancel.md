---
title: Cancel a file upload and handle server rejection
description: Send FormData, abort through timeout, and distinguish cancellation
weight: 30
---

## Problem

A large upload needs cancellation and useful server errors. The current fetch
transport does not expose upload progress events.

## Before you start

Register the controller on the application module and attach it to the form. Set
server-side size, content, authorization, and storage limits before accepting
files.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```js
class UploadController {
  static $inject = ['$http'];

  constructor($http) {
    this.$http = $http;
  }

  async send(file) {
    this.cancellation = Promise.withResolvers();
    const body = new FormData();
    body.append('file', file);

    try {
      await this.$http.post('/api/uploads', body, {
        timeout: this.cancellation.promise,
      });
    } catch (error) {
      if (error.xhrStatus !== 'abort') this.error = error.data.message;
    }
  }

  cancel() {
    this.cancellation?.resolve();
  }
}
```

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  ng-controller="UploadController as upload"
  ng-submit="upload.send(upload.files[0])"
>
  <input type="file" name="file" ng-model="upload.files" required />
  <button type="submit">Upload</button>
  <button type="button" ng-click="upload.cancel()">Cancel</button>
  <p ng-if="upload.error">{{ upload.error }}</p>
</form>
```

## Server contract

Validate size, MIME signature, filename, authorization, and storage limits on
the server. Return `413` for size limits and `422` JSON for rejected content.

## What AngularTS wires

Resolving the promise supplied as `timeout` aborts the underlying request. An
aborted request rejects with `xhrStatus === 'abort'`.

## Failure path

Do not set `Content-Type` manually for `FormData`; the browser adds the
multipart boundary. Do not advertise progress: `uploadEventHandlers` is ignored
by the fetch transport today.

## Apply it now

Choose the largest upload your application accepts. Define its limit,
cancellation behavior, retry behavior, and the message returned for each server
rejection.

## Verify

Cancel during transfer, reject an oversized file, and retry a valid file.
Confirm an abort shows no failure message and no partial object becomes
accessible.
