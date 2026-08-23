---
title: Load one select from another
description: Request valid choices when a parent selection changes
weight: 25
---

## Problem

A city, model, or category list depends on an earlier selection and should not
be loaded before it is needed.

## Before you start

The parent values must use stable server identifiers. The child endpoint must
validate the parent identifier and return only choices valid for it.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  ng-init="countries = [{code:'LV', name:'Latvia'}, {code:'EE', name:'Estonia'}]; cities = []"
>
  <select
    name="country"
    ng-model="country"
    ng-options="item.code as item.name for item in countries"
    ng-get="/api/cities?country={{ country }}"
    on-success="cities = $res; city = undefined"
  ></select>

  <select
    name="city"
    ng-model="city"
    ng-options="item.id as item.name for item in cities"
    ng-disabled="!cities.length"
  ></select>
</form>
```

## Server contract

`GET /api/cities?country=LV` returns a bounded JSON array such as
`[{"id":1,"name":"Riga"}]`. Reject unknown country codes on the server.

## What AngularTS wires

A select uses `change` as its default HTTP trigger. The response replaces the
available cities and clears a city that belonged to the previous country.

## Failure path

Clear dependent values before showing new choices. Show a retry message when the
request fails instead of leaving stale choices enabled.

## Apply it now

Find a form that initially downloads every possible option. Move one dependent
list behind its parent selection and compare initial payload size.

## Verify

Change the parent twice. Confirm the child value clears, stale choices cannot be
submitted, and the request includes only an allowed parent identifier.
