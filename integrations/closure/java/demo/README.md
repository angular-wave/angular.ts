# Java/J2CL todo application

This project shows an AngularTS todo list written in Java and compiled with
J2CL.

It includes:

- the `angular-ts-java` Maven dependency;
- annotation processor configuration;
- an `@AngularEntryPoint` startup method;
- template-facing Java types marked with `@AngularTemplateApi`;
- the J2CL plugin configuration;
- an HTML page that loads AngularTS and the compiled JavaScript.

## Build

Install JDK 21, Maven, and Node.js, then run from this directory:

```sh
mvn package
```

The page output is written under `target/webapp`. Serve that directory over
HTTP and open the todo page. Do not open the HTML through a `file:` URL.

Use this project as the starting structure for a Java application, then replace
the todo controller and template API with your own feature.
