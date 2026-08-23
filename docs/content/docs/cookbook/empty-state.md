---
title: Turn an empty result into the next action
description: Distinguish no data from loading and failure, then explain what to do
weight: 74
---

## Problem

An empty collection renders a blank region that looks broken and gives no path
forward.

## Before you start

Separate first-use emptiness, filter emptiness, permission limits, loading, and
request failure. They require different messages and actions.

## Render the empty case deliberately

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<section>
  <ul ng-if="projects.length > 0">
    <li ng-repeat="project in projects">{{ project.name }}</li>
  </ul>
  <div ng-if="projects.length === 0">
    <h2>No projects yet</h2>
    <p>Create the first project to organize this work.</p>
    <a href="/projects/new">Create a project</a>
  </div>
</section>
```

## Server contract

Return an empty collection as a successful result. Do not use `404` for a valid
collection with no records. Preserve active filters so the empty explanation can
offer clearing them when appropriate.

## Failure path

Never render the empty state while the request failed or has not completed; doing
so falsely tells the user that their data is gone.

## Apply it now

Find one blank list and write the exact reason it can be empty. Add the next useful
action for that reason.

## Verify

Test first use, filters with no matches, permission-limited data, slow loading,
request failure, and a non-empty result.
