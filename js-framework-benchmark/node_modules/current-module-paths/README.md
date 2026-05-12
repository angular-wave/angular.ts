[![view on npm](https://badgen.net/npm/v/current-module-paths)](https://www.npmjs.org/package/current-module-paths)
[![npm module downloads](https://badgen.net/npm/dt/current-module-paths)](https://www.npmjs.org/package/current-module-paths)
[![Gihub repo dependents](https://badgen.net/github/dependents-repo/75lb/current-module-paths)](https://github.com/75lb/current-module-paths/network/dependents?dependent_type=REPOSITORY)
[![Gihub package dependents](https://badgen.net/github/dependents-pkg/75lb/current-module-paths)](https://github.com/75lb/current-module-paths/network/dependents?dependent_type=PACKAGE)
[![Node.js CI](https://github.com/75lb/current-module-paths/actions/workflows/node.js.yml/badge.svg)](https://github.com/75lb/current-module-paths/actions/workflows/node.js.yml)

# current-module-paths

Access to the CommonJS `__filename` and `__dirname` variables within ECMAScript modules.

Only use this module if your code depends on the above global variables being defined, otherwise use [import.meta](https://nodejs.org/docs/latest/api/esm.html#no-__filename-or-__dirname).


```js
import currentModulePaths from 'current-module-paths'

const { __filename, __dirname } = currentModulePaths(import.meta.url)
```

* * *

&copy; 2021-25 [Lloyd Brookes](https://github.com/75lb) \<opensource@75lb.com\>.
