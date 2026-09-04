# AngularTS with Closure Compiler

Use Closure Compiler ADVANCED optimization without renaming AngularTS public
APIs. AngularTS stays outside the compiled application and the npm package's
extern file describes the runtime surface to Closure.

## Install

```sh
npm install @angular-wave/angular.ts google-closure-compiler
```

## Compile

Pass the AngularTS extern file when compiling application code:

```sh
npx google-closure-compiler \
  --compilation_level ADVANCED \
  --externs node_modules/@angular-wave/angular.ts/dist/externs/angular.js \
  --js src/app.js \
  --js_output_file dist/app.js
```

Load AngularTS before the compiled application:

```html
<script src="/node_modules/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
<script src="/dist/app.js"></script>
```

Keep AngularTS external, promote Closure warnings to errors, and compile the
production bundle with ADVANCED mode before deployment.

See `integrations/closure/demo` for a complete todo application. Java/J2CL and
ClojureScript setup have separate READMEs in their integration directories.
