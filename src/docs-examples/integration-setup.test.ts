import { expect, type APIRequestContext, test } from "@playwright/test";

async function read(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(`/${path}`);
  expect(response.ok()).toBe(true);
  return response.text();
}

test("Java setup uses the published binding as dependency and processor", async ({
  request,
}) => {
  const [guide, pom, bindingPom] = await Promise.all([
    read(request, "docs/content/docs/integrations/java-j2cl.md"),
    read(request, "integrations/closure/java/demo/pom.xml"),
    read(request, "integrations/closure/java/pom.xml"),
  ]);

  expect(guide).toContain("angular-ts-java");
  expect(guide).toContain("<angular.ts.version>0.34.0</angular.ts.version>");
  expect(guide).toContain("Java sources and AngularTS externs required by");
  expect(pom).toContain("<artifactId>angular-ts-java</artifactId>");
  expect(pom).toContain("<annotationProcessorPaths>");
  expect(bindingPom).toContain("<include>META-INF/externs/*.js</include>");
  expect(pom).not.toContain("angular.ts.handwritten.sources");
});

test("ClojureScript setup uses the facade and packaged Closure externs", async ({
  request,
}) => {
  const [guide, facade] = await Promise.all([
    read(request, "docs/content/docs/integrations/clojurescript.md"),
    read(
      request,
      "integrations/closure/clojurescript/src/angular_ts/core.cljs",
    ),
  ]);

  expect(guide).toContain('[io.github.angular-wave/angular-ts-cljs "0.34.0"]');
  expect(guide).toContain(':externs ["angular_ts/externs/angular.js"]');
  expect(facade).toContain("(defn model");
  expect(facade).toContain("(defn controller");
});

test("Scala setup uses the direct typed model controller workflow", async ({
  request,
}) => {
  const [guide, app] = await Promise.all([
    read(request, "docs/content/docs/integrations/scala.md"),
    read(
      request,
      "integrations/scala/examples/basic_app/src/main/scala/angular/ts/examples/basic/BasicApp.scala",
    ),
  ]);

  expect(guide).toContain(
    '"io.github.angular-wave" %%% "angular-ts-scala" % "0.34.0"',
  );
  expect(guide).toContain("enablePlugins(ScalaJSPlugin)");
  expect(app).toContain('.controller("TodoCtrl", todoModel)');
});
