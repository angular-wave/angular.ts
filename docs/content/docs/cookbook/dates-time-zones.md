---
title: Submit dates and times with an explicit time zone
description: Distinguish calendar dates, local times, and exact instants
weight: 61
---

## Problem

A date or appointment moves by a day or hour when users and servers use different
time zones.

## Before you start

Decide whether each value is a calendar date, a local wall-clock time, or an exact
instant. These are different domain values and need different storage rules.

## Send the local value and zone together

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/appointments" on-error="errors = $res">
  <label>
    Local start
    <input name="localStart" type="datetime-local" required />
  </label>
  <label>
    Time zone
    <select name="timeZone" required>
      <option value="Europe/Riga">Europe/Riga</option>
    </select>
  </label>
  <p ng-if="errors.localStart">{{ errors.localStart }}</p>
  <button type="submit">Schedule</button>
</form>
```

## Server contract

Resolve local time with an IANA zone, reject nonexistent daylight-saving times,
and define how ambiguous times are chosen. Store exact instants in UTC while
retaining the zone when future local scheduling depends on it.

## Failure path

Do not append `Z` to a local value or assume the server's zone. Return `422` when
the local time cannot identify the intended instant.

## Apply it now

Classify every date field in one workflow as date, local time, or instant. Rename
ambiguous fields and include the missing zone where required.

## Verify

Test users in two zones, both daylight-saving transitions, leap day, midnight,
and a date-only value that must never shift.
