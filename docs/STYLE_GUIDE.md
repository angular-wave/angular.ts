# Documentation style guide

AngularTS documentation assumes the reader knows nothing about AngularTS and may
be new to browser development.

## Write for a first-time reader

- Define a term before using it. Link repeated terms to the glossary.
- State what the reader will build or learn and what they need first.
- Introduce one new framework idea at a time.
- Explain what each code block changes and what the reader should observe.
- Prefer short sentences, active voice, and concrete nouns.
- Never tell readers to consult AngularJS documentation for shipped behavior.
- End learning pages with one explicit next step.

## Keep examples uniform

Beginner guides extend the task-list application. Use `todoApp`,
`TodoController`, `draft`, and `todos` unless another domain is essential to the
feature. Show the smallest complete change and keep snippets under 30 non-empty
lines.

Use HTML templates for the first path. Introduce typed component views only
after modules, state, events, and reactive updates are understood.

Never publish an untested code block. Put a `tested-by` comment immediately
before each block and point it at the Jasmine or Playwright suite that verifies
the shown behavior:

```text
<!-- tested-by: src/directive/el/el.spec.ts -->
```

The docs gate checks that the test exists and contains executable test cases.

## Separate content by purpose

- Tutorials teach by building a complete result in order.
- Guides solve one practical task and may assume the first tutorial.
- Concepts explain mental models and tradeoffs.
- Reference pages describe exact syntax, parameters, return values, errors, and
  lifecycle behavior.
- Migration pages map an old API or design to the shipped replacement.

Do not turn a reference page into a tutorial. Link to the relevant guide.

## Link public types

Every inline reference to a public type must link to its generated TypeDoc page.
For example, write
[`ProgrammaticViewContext`](static/typedoc/interfaces/ProgrammaticViewContext.html)
instead of an unlinked code-formatted type name. The `docs-type-links-check`
target enforces this rule in site content.

## Describe an API consistently

Reference pages should answer these questions in order:

1. What problem does this API solve?
2. Where can it be used?
3. What is the smallest valid example?
4. What inputs and outputs does it have?
5. When does it run and how is it cleaned up?
6. Which failures or security constraints matter?
7. Which guide should a beginner read next?

## Validate changes

Run `make docs-requirement`. It checks examples against the package exports and
runtime, TypeDoc links, snippet size, snippet test coverage, learning-page
structure, generated API docs, and the Hugo build.

## Make examples immediately useful

Use a task and outcome from a real application. Do not use toy arithmetic,
placeholder callbacks, or an API in isolation when two shipped features form the
useful pattern. Show the request and server response when they determine
behavior. Cover the failure and non-pointer paths that change the design.

End each progressive cookbook recipe with `## Apply it now`. Ask the reader to
identify a specific element, endpoint, request, state, or measured bottleneck in
their current application. Give them an observable result that proves the
pattern worked. Avoid generic prompts such as “consider using this feature.”

## Use the cookbook recipe contract

Progressive recipes use these sections when they apply: `Problem`,
`Before you start`, `Working example`, `Server contract`,
`What AngularTS wires`, `Failure path`, `Apply it now`, and `Verify`. Omit only
sections that have no meaning for the task. Prefer a complete tested flow over
several disconnected API fragments.
