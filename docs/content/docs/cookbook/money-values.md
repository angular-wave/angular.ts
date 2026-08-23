---
title: Submit money without floating-point surprises
description: Send a decimal string and perform currency arithmetic on the server
weight: 60
---

## Problem

An amount changes by a cent because browser or server code treats currency as a
binary floating-point number.

## Before you start

Choose the currency, accepted decimal precision, rounding rule, minimum, and
maximum on the server. Never infer currency only from the user's locale.

## Submit the entered decimal text

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/invoices" on-error="errors = $res">
  <label>
    Amount in EUR
    <input
      name="amount"
      inputmode="decimal"
      autocomplete="off"
      required
    />
  </label>
  <input name="currency" type="hidden" value="EUR" />
  <p ng-if="errors.amount">{{ errors.amount }}</p>
  <button type="submit">Create invoice</button>
</form>
```

## Server contract

Parse the amount with a decimal or money type, validate its scale, and store
minor units or an exact decimal together with the currency. Return formatted
display text separately from the canonical value when needed.

## Failure path

Reject ambiguous separators and unsupported precision with `422`. Do not silently
round an amount when that changes what the user authorized.

## Apply it now

Trace one amount from input through JSON, application code, database, and output.
Remove every binary floating-point conversion from that path.

## Verify

Test `0.01`, large values, too many decimal places, negative values, comma input,
and a currency with a different minor-unit rule.
