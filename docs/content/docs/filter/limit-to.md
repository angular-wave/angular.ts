---
title: Limit to
description: Return a bounded part of an array, string, or number.
weight: 30
---

# Limit to filter

## Description

Creates a new array or string containing only a specified number of elements.
The elements are taken from either the beginning or the end of the source array,
string, or number, as specified by the value and sign (positive or negative) of
`limit`. Other array-like objects are also supported (e.g., array subclasses,
NodeLists, JQLite/jQuery collections, etc.). If a number is used as input, it is
converted to a string.

## Parameters

- **input** `{Array|ArrayLike|string|number}`: Array/array-like, string, or
  number to be limited.
- **limit** `{string|number}`: The length of the returned array or string.
  - If the `limit` number is positive, `limit` number of items from the
    beginning of the source array/string are copied.
  - If the number is negative, `limit` number of items from the end of the
    source array/string are copied.
  - The `limit` will be trimmed if it exceeds `array.length`.
  - If `limit` is undefined, the input will be returned unchanged.
- **begin** `{(string|number)=}`: Index at which to begin limitation. As a
  negative index, `begin` indicates an offset from the end of `input`. Defaults
  to `0`.

## Returns

- `{Array|string}`: A new sub-array or substring of length `limit` or less if
  the input had less than `limit` elements.
