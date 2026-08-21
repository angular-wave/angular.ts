package org.angular.ts.processor;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

final class AngularClosureProcessorTest {
  @TempDir Path temporaryDirectory;

  @Test
  void generatesClosureEntryPointAndTemplateExterns() throws IOException {
    Compilation compilation =
        compile(
            source(
                "example/App.java",
                lines(
                    "package example;",
                    "import jsinterop.annotations.JsMethod;",
                    "import jsinterop.annotations.JsPackage;",
                    "import jsinterop.annotations.JsType;",
                    "import org.angular.ts.annotation.AngularEntryPoint;",
                    "@JsType(name = \"App\", namespace = JsPackage.GLOBAL)",
                    "public final class App {",
                    "  @AngularEntryPoint",
                    "  @JsMethod",
                    "  public static void start() {}",
                    "}")),
            source(
                "example/TemplateController.java",
                lines(
                    "package example;",
                    "import jsinterop.annotations.JsPackage;",
                    "import jsinterop.annotations.JsType;",
                    "import org.angular.ts.annotation.AngularTemplateApi;",
                    "@AngularTemplateApi",
                    "@JsType(name = \"TemplateController\", namespace = JsPackage.GLOBAL)",
                    "public final class TemplateController {",
                    "  public String status;",
                    "  public void save() {}",
                    "}")));

    assertTrue(compilation.success, compilation::diagnostics);
    String entryPoint =
        Files.readString(
            compilation.generated.resolve("angular/ts/generated/entrypoint.js"));
    String externs =
        Files.readString(
            compilation.classes.resolve("META-INF/externs/angular-ts-template.externs.js"));
    assertTrue(entryPoint.contains("goog.require('App')"));
    assertTrue(entryPoint.contains("EntryPoint.start()"));
    assertTrue(entryPoint.contains("goog.exportProperty"));
    assertTrue(externs.contains("TemplateController.prototype.status"));
    assertTrue(externs.contains("TemplateController.prototype.save = function() {}"));
  }

  @Test
  void rejectsAnInvalidEntryPointSignature() throws IOException {
    Compilation compilation =
        compile(
            source(
                "example/InvalidApp.java",
                lines(
                    "package example;",
                    "import jsinterop.annotations.JsMethod;",
                    "import jsinterop.annotations.JsPackage;",
                    "import jsinterop.annotations.JsType;",
                    "import org.angular.ts.annotation.AngularEntryPoint;",
                    "@JsType(name = \"InvalidApp\", namespace = JsPackage.GLOBAL)",
                    "public final class InvalidApp {",
                    "  @AngularEntryPoint",
                    "  @JsMethod",
                    "  public void start() {}",
                    "}")));

    assertFalse(compilation.success);
    assertTrue(
        compilation
            .diagnostics()
            .contains("@AngularEntryPoint must be a public static zero-argument method."));
  }

  private Compilation compile(Source... sources) throws IOException {
    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    Path sourceRoot = temporaryDirectory.resolve("sources-" + System.nanoTime());
    Path classes = temporaryDirectory.resolve("classes-" + System.nanoTime());
    Path generated = temporaryDirectory.resolve("generated-" + System.nanoTime());
    Files.createDirectories(sourceRoot);
    Files.createDirectories(classes);
    Files.createDirectories(generated);

    List<Path> sourcePaths = new ArrayList<>();
    for (Source source : sources) {
      Path path = sourceRoot.resolve(source.path);
      Files.createDirectories(path.getParent());
      Files.writeString(path, source.content);
      sourcePaths.add(path);
    }

    DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
    try (StandardJavaFileManager files =
        compiler.getStandardFileManager(diagnostics, Locale.ROOT, null)) {
      Iterable<? extends JavaFileObject> units = files.getJavaFileObjectsFromPaths(sourcePaths);
      List<String> options =
          Arrays.asList(
              "--release",
              "11",
              "-classpath",
              System.getProperty("java.class.path"),
              "-d",
              classes.toString(),
              "-s",
              generated.toString(),
              "-processor",
              AngularClosureProcessor.class.getName());
      boolean success =
          Boolean.TRUE.equals(
              compiler.getTask(null, files, diagnostics, options, null, units).call());
      return new Compilation(success, diagnostics.getDiagnostics(), classes, generated);
    }
  }

  private static Source source(String path, String content) {
    return new Source(path, content);
  }

  private static String lines(String... lines) {
    return String.join(System.lineSeparator(), lines);
  }

  private static final class Source {
    private final String path;
    private final String content;

    private Source(String path, String content) {
      this.path = path;
      this.content = content;
    }
  }

  private static final class Compilation {
    private final boolean success;
    private final List<Diagnostic<? extends JavaFileObject>> messages;
    private final Path classes;
    private final Path generated;

    private Compilation(
        boolean success,
        List<Diagnostic<? extends JavaFileObject>> messages,
        Path classes,
        Path generated) {
      this.success = success;
      this.messages = messages;
      this.classes = classes;
      this.generated = generated;
    }

    private String diagnostics() {
      StringBuilder output = new StringBuilder();
      for (Diagnostic<? extends JavaFileObject> diagnostic : messages) {
        if (output.length() > 0) output.append(System.lineSeparator());
        output.append(diagnostic.getMessage(Locale.ROOT));
      }
      return output.toString();
    }
  }
}
