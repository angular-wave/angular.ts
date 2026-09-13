package io.github.angularwave.android.compiler;

import java.io.IOException;
import java.io.Writer;
import java.util.Set;
import java.util.Map;
import java.util.HashMap;
import java.util.TreeSet;
import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.FilerException;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.NestingKind;
import javax.lang.model.element.TypeElement;
import javax.lang.model.type.TypeKind;
import javax.tools.Diagnostic;
import javax.tools.StandardLocation;

/** Generates the ServiceLoader entry used to discover native element providers. */
@SupportedAnnotationTypes({
  NativeElementProviderProcessor.ANNOTATION,
  NativeElementProviderProcessor.ROUTE_ANNOTATION,
  NativeElementProviderProcessor.CAPABILITY_ANNOTATION
})
@SupportedSourceVersion(SourceVersion.RELEASE_17)
public final class NativeElementProviderProcessor extends AbstractProcessor {
  static final String ANNOTATION =
      "io.github.angularwave.android.navigation.elements.RegisterNativeElementProvider";
  static final String ROUTE_ANNOTATION =
      "io.github.angularwave.android.navigation.routing.RegisterRouteDecisionHandlerProvider";
  static final String CAPABILITY_ANNOTATION =
      "io.github.angularwave.android.navigation.bridge.RegisterNativeCapabilityProvider";
  private static final String PROVIDER =
      "io.github.angularwave.android.navigation.elements.NativeElementProvider";
  private static final String SERVICE = "META-INF/services/" + PROVIDER;
  private static final String ROUTE_PROVIDER =
      "io.github.angularwave.android.navigation.routing.RouteDecisionHandlerProvider";
  private static final String ROUTE_SERVICE = "META-INF/services/" + ROUTE_PROVIDER;
  private static final String CAPABILITY_PROVIDER =
      "io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider";
  private static final String CAPABILITY_SERVICE = "META-INF/services/" + CAPABILITY_PROVIDER;

  private final Set<String> providers = new TreeSet<>();
  private final Set<String> routeProviders = new TreeSet<>();
  private final Set<String> capabilityProviders = new TreeSet<>();
  private final Map<String, Element> nativeNames = new HashMap<>();
  private final Map<String, Element> capabilityNames = new HashMap<>();

  @Override
  public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment round) {
    collect(round, ANNOTATION, PROVIDER, providers, true);
    collect(round, ROUTE_ANNOTATION, ROUTE_PROVIDER, routeProviders, false);
    collect(round, CAPABILITY_ANNOTATION, CAPABILITY_PROVIDER, capabilityProviders, true);
    if (round.processingOver()) {
      if (!providers.isEmpty()) writeServiceFile(SERVICE, providers);
      if (!routeProviders.isEmpty()) writeServiceFile(ROUTE_SERVICE, routeProviders);
      if (!capabilityProviders.isEmpty()) {
        writeServiceFile(CAPABILITY_SERVICE, capabilityProviders);
      }
    }
    return true;
  }

  private void collect(
      RoundEnvironment round,
      String annotationName,
      String providerName,
      Set<String> values,
      boolean validateNames) {
    TypeElement annotation = processingEnv.getElementUtils().getTypeElement(annotationName);
    TypeElement provider = processingEnv.getElementUtils().getTypeElement(providerName);
    if (annotation != null && provider != null) {
      for (Element element : round.getElementsAnnotatedWith(annotation)) {
        if (!(element instanceof TypeElement type)) continue;
        String providerLabel = provider.getSimpleName().toString();
        if (!processingEnv.getTypeUtils().isAssignable(type.asType(), provider.asType())
            || !type.getModifiers().contains(Modifier.PUBLIC)
            || type.getModifiers().contains(Modifier.ABSTRACT)
            || (type.getNestingKind() != NestingKind.TOP_LEVEL
                && !type.getModifiers().contains(Modifier.STATIC))
            || !hasPublicNoArgConstructor(type)) {
          error(
              "A registered "
                  + providerLabel
                  + " must be public, concrete, static or top-level, and have a public no-argument constructor",
              element);
          continue;
        }
        if (validateNames
            && !collectNames(
                type,
                annotationName,
                annotationName.equals(ANNOTATION) ? nativeNames : capabilityNames,
                annotationName.equals(ANNOTATION) ? "Native element name" : "Native capability target")) {
          continue;
        }
        values.add(type.getQualifiedName().toString());
      }
    }
  }

  private boolean hasPublicNoArgConstructor(TypeElement type) {
    var constructors =
        type.getEnclosedElements().stream()
            .filter(element -> element.getKind() == javax.lang.model.element.ElementKind.CONSTRUCTOR)
            .map(ExecutableElement.class::cast)
            .toList();
    if (constructors.isEmpty()) return true;
    return constructors.stream()
        .anyMatch(
            constructor ->
                constructor.getParameters().isEmpty()
                    && constructor.getModifiers().contains(Modifier.PUBLIC));
  }

  private boolean collectNames(
      TypeElement type, String annotationName, Map<String, Element> knownNames, String label) {
    AnnotationMirror registration =
        type.getAnnotationMirrors().stream()
            .filter(
                mirror ->
                    ((TypeElement) mirror.getAnnotationType().asElement())
                        .getQualifiedName()
                        .contentEquals(annotationName))
            .findFirst()
            .orElse(null);
    if (registration == null) return false;
    var entries = processingEnv.getElementUtils().getElementValuesWithDefaults(registration);
    var names = entries.values().stream().findFirst().map(AnnotationValue::getValue).orElse(null);
    if (!(names instanceof java.util.List<?> list) || list.isEmpty()) {
      error(label + " registration requires at least one name", type);
      return false;
    }
    boolean valid = true;
    for (Object entry : list) {
      String name = String.valueOf(((AnnotationValue) entry).getValue());
      if (!name.matches("[a-z][a-z0-9]*(?:-[a-z0-9]+)*")) {
        error(label + "s must use lowercase kebab-case: " + name, type);
        valid = false;
      } else {
        Element previous = knownNames.putIfAbsent(name, type);
        if (previous != null && previous != type) {
          error("Duplicate " + label.toLowerCase() + ": " + name, type);
          valid = false;
        }
      }
    }
    return valid;
  }

  private void error(String message, Element element) {
    processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, message, element);
  }

  private void writeServiceFile(String service, Set<String> values) {
    try (Writer writer =
        processingEnv
            .getFiler()
            .createResource(StandardLocation.CLASS_OUTPUT, "", service)
            .openWriter()) {
      for (String provider : values) writer.write(provider + "\n");
    } catch (FilerException ignored) {
      // Another processor round already generated the deterministic resource.
    } catch (IOException error) {
      processingEnv
          .getMessager()
          .printMessage(Diagnostic.Kind.ERROR, "Unable to generate " + service + ": " + error);
    }
  }
}
