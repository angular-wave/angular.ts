# AngularTS Internal style guide

## 🔒 Assert Validation

Asserts enforce **framework correctness**, not **application behavior**.

Asserts exist to **detect developer errors**, enforce **internal
invariants**, and make framework misuse fail fast during development.\
They are *not* a general-purpose validation mechanism for runtime or
user-controlled data.

Any assert must:
-   fail early and loudly with developer-only "sanity" checks
-   maintain and support **public** API contracts and types
-   must itself be part of the API via `@throw` tag

#### ✅ When to Use Asserts

Use asserts **only** when the error indicates a **fatal error**
or **misuse of an internal API** such that a framework cannot function.

Asserts SHOULD be used when:

-   An internal invariant is violated.
-   An API contract is not respected by developers.
-   A value should *never* be invalid if the code using the API assumes it 
    to be correct.
-   The input originates from the framework itself, not from end-users or
    dynamic data.
-   The failure shoudl notify the developer to immediately stop what they are
    doing and refactor their code.

#### ❌ When *Not* to Use Asserts

Do **not** use asserts for anything that may fail due to **external
conditions**, **user-controlled input** or performance-critical code.

Asserts SHOULD NOT be used for:

-   End-user data.
-   JSON data, environment config, or network responses.
-   Errors that are part of expected runtime behavior.
-   Validation of business rules.

Assert SHOULD NOT be used in "hot code paths" or any place where
its use can degrade the performance of the application over a period of time.

These should be handled either by the developer, before it reaches the framework API, 
or by a unified error sink at the framework level, such as `$exceptionHandler`;

###### Examples

-   User-provided data fails validation.
-   Server returns malformed JSON.
-   Missing runtime config.
-   Event payloads have unexpected types.
-   Anything that can be corrected by the user instead of the developer.

