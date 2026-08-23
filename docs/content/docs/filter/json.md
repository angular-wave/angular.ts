---
title: JSON
description: Render a value as formatted JSON for inspection and debugging.
weight: 20
---

# JSON filter

## Description

Allows you to convert a JavaScript object into a JSON string.

This filter is mostly useful for debugging. When using the double curly
`{{value}}` notation, the binding is automatically converted to JSON.

## Parameters

- **object** `{*}`: Any JavaScript object (including arrays and primitive types)
  to filter.
- **spacing** `{number=}`: The number of spaces to use per indentation, defaults
  to 2.

## Returns

- `{string}`: JSON string.
