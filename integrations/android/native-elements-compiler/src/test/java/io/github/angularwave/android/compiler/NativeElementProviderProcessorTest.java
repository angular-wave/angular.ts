package io.github.angularwave.android.compiler;

import static com.google.testing.compile.CompilationSubject.assertThat;

import com.google.testing.compile.Compiler;
import com.google.testing.compile.JavaFileObjects;
import java.io.IOException;
import javax.tools.StandardLocation;
import org.junit.Test;

public final class NativeElementProviderProcessorTest {
  @Test
  public void writesDeterministicServiceMetadata() throws IOException {
    var result = compile(
        "@RegisterNativeElementProvider(names = {\"task-card\"}) public final class Tasks implements NativeElementProvider {}"
    );

    assertThat(result).succeeded();
    assertThat(result)
        .generatedFile(
            StandardLocation.CLASS_OUTPUT,
            "META-INF/services/io.github.angularwave.android.navigation.elements.NativeElementProvider")
        .contentsAsUtf8String()
        .isEqualTo("test.Tasks\n");
  }

  @Test
  public void rejectsInvalidAndDuplicateNames() {
    var result = compile(
        "@RegisterNativeElementProvider(names = {\"Task\"}) public final class Bad implements NativeElementProvider {}",
        "@RegisterNativeElementProvider(names = {\"task-card\"}) public final class First implements NativeElementProvider {}",
        "@RegisterNativeElementProvider(names = {\"task-card\"}) public final class Second implements NativeElementProvider {}"
    );

    assertThat(result).failed();
    assertThat(result).hadErrorContaining("lowercase kebab-case");
    assertThat(result).hadErrorContaining("Duplicate native element name: task-card");
  }

  @Test
  public void rejectsProvidersServiceLoaderCannotConstruct() {
    var result = compile(
        "@RegisterNativeElementProvider(names = {\"abstract-card\"}) public abstract class AbstractCard implements NativeElementProvider {}",
        "@RegisterNativeElementProvider(names = {\"argument-card\"}) public final class ArgumentCard implements NativeElementProvider { public ArgumentCard(String value) {} }"
    );

    assertThat(result).failed();
    assertThat(result).hadErrorContaining("public, concrete, static or top-level");
    assertThat(result).hadErrorContaining("public no-argument constructor");
  }

  @Test
  public void writesCapabilityServiceMetadata() throws IOException {
    var result = compileCapabilities(
        "@RegisterNativeCapabilityProvider(targets = {\"device-info\"}) public final class DeviceInfo implements NativeCapabilityProvider {}"
    );

    assertThat(result).succeeded();
    assertThat(result)
        .generatedFile(
            StandardLocation.CLASS_OUTPUT,
            "META-INF/services/io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider")
        .contentsAsUtf8String()
        .isEqualTo("test.DeviceInfo\n");
  }

  @Test
  public void rejectsInvalidAndDuplicateCapabilityTargets() {
    var result = compileCapabilities(
        "@RegisterNativeCapabilityProvider(targets = {\"Device\"}) public final class Bad implements NativeCapabilityProvider {}",
        "@RegisterNativeCapabilityProvider(targets = {\"device-info\"}) public final class First implements NativeCapabilityProvider {}",
        "@RegisterNativeCapabilityProvider(targets = {\"device-info\"}) public final class Second implements NativeCapabilityProvider {}"
    );

    assertThat(result).failed();
    assertThat(result).hadErrorContaining("Native capability targets must use lowercase kebab-case");
    assertThat(result).hadErrorContaining("Duplicate native capability target: device-info");
  }

  private static com.google.testing.compile.Compilation compile(String... providers) {
    var sources = new java.util.ArrayList<javax.tools.JavaFileObject>();
    sources.add(JavaFileObjects.forSourceLines(
        "io.github.angularwave.android.navigation.elements.NativeElementProvider",
        "package io.github.angularwave.android.navigation.elements;",
        "public interface NativeElementProvider {}"
    ));
    sources.add(JavaFileObjects.forSourceLines(
        "io.github.angularwave.android.navigation.elements.RegisterNativeElementProvider",
        "package io.github.angularwave.android.navigation.elements;",
        "import java.lang.annotation.*;",
        "@Target(ElementType.TYPE) public @interface RegisterNativeElementProvider { String[] names(); }"
    ));
    for (int index = 0; index < providers.length; index++) {
      String declaration = providers[index];
      String name = declaration.substring(declaration.indexOf("class ") + 6).split(" ")[0];
      sources.add(JavaFileObjects.forSourceLines(
          "test." + name,
          "package test;",
          "import io.github.angularwave.android.navigation.elements.*;",
          declaration
      ));
    }
    return Compiler.javac()
        .withProcessors(new NativeElementProviderProcessor())
        .compile(sources);
  }

  private static com.google.testing.compile.Compilation compileCapabilities(String... providers) {
    var sources = new java.util.ArrayList<javax.tools.JavaFileObject>();
    sources.add(JavaFileObjects.forSourceLines(
        "io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider",
        "package io.github.angularwave.android.navigation.bridge;",
        "public interface NativeCapabilityProvider {}"
    ));
    sources.add(JavaFileObjects.forSourceLines(
        "io.github.angularwave.android.navigation.bridge.RegisterNativeCapabilityProvider",
        "package io.github.angularwave.android.navigation.bridge;",
        "import java.lang.annotation.*;",
        "@Target(ElementType.TYPE) public @interface RegisterNativeCapabilityProvider { String[] targets(); }"
    ));
    for (String declaration : providers) {
      String name = declaration.substring(declaration.indexOf("class ") + 6).split(" ")[0];
      sources.add(JavaFileObjects.forSourceLines(
          "test." + name,
          "package test;",
          "import io.github.angularwave.android.navigation.bridge.*;",
          declaration
      ));
    }
    return Compiler.javac()
        .withProcessors(new NativeElementProviderProcessor())
        .compile(sources);
  }
}
