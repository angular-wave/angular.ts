package org.angular.ts.processor;

import java.io.IOException;
import java.io.Writer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.Filer;
import javax.annotation.processing.Generated;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import javax.tools.Diagnostic;
import javax.tools.JavaFileManager;
import javax.tools.StandardLocation;
import org.angular.ts.annotation.AngularEntryPoint;
import org.angular.ts.annotation.AngularTemplateApi;

/** Generates the Closure bootstrap and extern contract required by Angular template expressions. */
@Generated("org.angular.ts.processor.AngularClosureProcessor")
@SupportedSourceVersion(SourceVersion.RELEASE_11)
@SupportedAnnotationTypes({
  "org.angular.ts.annotation.AngularEntryPoint",
  "org.angular.ts.annotation.AngularTemplateApi"
})
public final class AngularClosureProcessor extends AbstractProcessor {
  private static final String JS_METHOD = "jsinterop.annotations.JsMethod";
  private static final String JS_IGNORE = "jsinterop.annotations.JsIgnore";
  private static final String JS_PROPERTY = "jsinterop.annotations.JsProperty";
  private static final String JS_TYPE = "jsinterop.annotations.JsType";
  private static final String GENERATED_MODULE = "angular.ts.generated.entrypoint";
  private static final Pattern JS_IDENTIFIER =
      Pattern.compile("[$A-Z_a-z][$0-9A-Z_a-z]*");

  private boolean generated;

  @Override
  public boolean process(
      Set<? extends TypeElement> annotations, RoundEnvironment roundEnvironment) {
    if (generated || roundEnvironment.processingOver()) {
      return true;
    }

    Set<? extends Element> entryPoints =
        roundEnvironment.getElementsAnnotatedWith(AngularEntryPoint.class);
    Set<? extends Element> templateApis =
        roundEnvironment.getElementsAnnotatedWith(AngularTemplateApi.class);

    if (entryPoints.isEmpty()) {
      return true;
    }

    if (entryPoints.size() != 1) {
      for (Element entryPoint : entryPoints) {
        error(entryPoint, "Exactly one @AngularEntryPoint is allowed per compilation.");
      }
      return true;
    }

    Element entryPoint = entryPoints.iterator().next();
    if (!(entryPoint instanceof ExecutableElement)) {
      error(entryPoint, "@AngularEntryPoint must annotate a method.");
      return true;
    }

    ExecutableElement method = (ExecutableElement) entryPoint;
    if (!method.getModifiers().contains(Modifier.PUBLIC)
        || !method.getModifiers().contains(Modifier.STATIC)
        || !method.getParameters().isEmpty()) {
      error(method, "@AngularEntryPoint must be a public static zero-argument method.");
      return true;
    }

    TypeElement entryType = (TypeElement) method.getEnclosingElement();
    JsTypeApi entryApi = readJsType(entryType);
    if (entryApi == null) {
      return true;
    }

    String entryMethod = readJsName(method, JS_METHOD, method.getSimpleName().toString());
    if (entryMethod == null) {
      error(method, "@AngularEntryPoint must also be annotated with @JsMethod.");
      return true;
    }

    List<JsTypeApi> exportedTypes = new ArrayList<>();
    for (Element templateApi : templateApis) {
      if (!(templateApi instanceof TypeElement)) {
        error(templateApi, "@AngularTemplateApi must annotate a class.");
        continue;
      }
      JsTypeApi api = readJsType((TypeElement) templateApi);
      if (api != null) {
        exportedTypes.add(api);
      }
    }
    exportedTypes.sort(Comparator.comparing(api -> api.qualifiedName));

    if (processingEnv.getMessager() == null) {
      return true;
    }

    try {
      writeClosureModule(entryApi, entryMethod, exportedTypes);
      writeExterns(exportedTypes);
      generated = true;
    } catch (IOException exception) {
      error(method, "Unable to generate AngularTS Closure bootstrap: " + exception.getMessage());
    }
    return true;
  }

  private JsTypeApi readJsType(TypeElement type) {
    AnnotationMirror jsType = findAnnotation(type, JS_TYPE);
    if (jsType == null) {
      error(type, "AngularTS Closure annotations require an explicit @JsType.");
      return null;
    }

    String name = annotationValue(jsType, "name");
    if (name == null || name.isEmpty() || "<auto>".equals(name)) {
      error(type, "@JsType must declare an explicit global name.");
      return null;
    }
    if (!JS_IDENTIFIER.matcher(name).matches()) {
      error(type, "@JsType name must be a JavaScript identifier: " + name);
      return null;
    }

    Map<String, MemberKind> members = new LinkedHashMap<>();
    List<? extends Element> enclosedElements = new ArrayList<>(type.getEnclosedElements());
    enclosedElements.sort(Comparator.comparing(element -> element.getSimpleName().toString()));
    for (Element member : enclosedElements) {
      if (!member.getModifiers().contains(Modifier.PUBLIC)
          || member.getModifiers().contains(Modifier.STATIC)
          || findAnnotation(member, JS_IGNORE) != null) {
        continue;
      }
      if (member.getKind() == ElementKind.FIELD && member instanceof VariableElement) {
        String property = readJsName(member, JS_PROPERTY, member.getSimpleName().toString());
        if (property == null) {
          property = member.getSimpleName().toString();
        }
        if (validateMemberName(member, property)) {
          addMember(members, member, property, MemberKind.PROPERTY);
        }
        continue;
      }
      if (member.getKind() == ElementKind.METHOD && member instanceof ExecutableElement) {
        if (findAnnotation(member, JS_PROPERTY) != null) {
          error(
              member,
              "@JsProperty accessor methods cannot be exported safely; expose a @JsMethod instead.");
          continue;
        }
        String jsMethod = readJsName(member, JS_METHOD, member.getSimpleName().toString());
        if (jsMethod == null) {
          jsMethod = member.getSimpleName().toString();
        }
        if (validateMemberName(member, jsMethod)) {
          addMember(members, member, jsMethod, MemberKind.METHOD);
        }
      }
    }

    return new JsTypeApi(type.getQualifiedName().toString(), name, members);
  }

  private void addMember(
      Map<String, MemberKind> members, Element member, String name, MemberKind kind) {
    MemberKind existing = members.putIfAbsent(name, kind);
    if (existing != null) {
      error(member, "Template API member name is overloaded or duplicated: " + name);
    }
  }

  private boolean validateMemberName(Element member, String name) {
    if (JS_IDENTIFIER.matcher(name).matches()) {
      return true;
    }
    error(member, "Template API member name must be a JavaScript identifier: " + name);
    return false;
  }

  private void writeClosureModule(
      JsTypeApi entryApi, String entryMethod, List<JsTypeApi> exportedTypes) throws IOException {
    Filer filer = processingEnv.getFiler();
    JavaFileManager.Location output = StandardLocation.SOURCE_OUTPUT;
    try (Writer writer =
        filer
            .createResource(output, "angular.ts.generated", "entrypoint.js")
            .openWriter()) {
      writer.write("goog.module('" + GENERATED_MODULE + "');\n\n");
      writer.write("const EntryPoint = goog.require('" + entryApi.jsName + "');\n");
      for (int index = 0; index < exportedTypes.size(); index++) {
        writer.write(
            "const TemplateApi"
                + index
                + " = goog.require('"
                + exportedTypes.get(index).jsName
                + "');\n");
      }
      writer.write("\n");

      for (int index = 0; index < exportedTypes.size(); index++) {
        JsTypeApi api = exportedTypes.get(index);
        String alias = "TemplateApi" + index;
        writer.write("goog.exportSymbol('" + api.jsName + "', " + alias + ");\n");
        for (Map.Entry<String, MemberKind> member : api.members.entrySet()) {
          String name = member.getKey();
          if (member.getValue() == MemberKind.METHOD) {
            writer.write(
                "goog.exportProperty("
                    + alias
                    + ".prototype, '"
                    + name
                    + "', "
                    + alias
                    + ".prototype."
                    + name
                    + ");\n");
          } else {
            String bridge = alias + "_" + name;
            writer.write("const " + bridge + "Backing = new WeakMap();\n");
            writer.write("let " + bridge + "Accessing = false;\n");
            writer.write(
                "Object.defineProperty("
                    + alias
                    + ".prototype, '"
                    + name
                    + "', { configurable: true, get: /** @this {?} */ function() { if ("
                    + bridge
                    + "Accessing) { return "
                    + bridge
                    + "Backing.get(this); } "
                    + bridge
                    + "Accessing = true; const value = this."
                    + name
                    + "; "
                    + bridge
                    + "Accessing = false; return value; }, set: /** @this {?} */ function(value) { if ("
                    + bridge
                    + "Accessing) { "
                    + bridge
                    + "Backing.set(this, value); return; } "
                    + bridge
                    + "Accessing = true; this."
                    + name
                    + " = value; "
                    + bridge
                    + "Accessing = false; } });\n");
          }
        }
      }

      writer.write("\nEntryPoint." + entryMethod + "();\n");
    }
  }

  private void writeExterns(List<JsTypeApi> exportedTypes) throws IOException {
    try (Writer writer =
        processingEnv
            .getFiler()
            .createResource(
                StandardLocation.CLASS_OUTPUT,
                "",
                "META-INF/externs/angular-ts-template.externs.js")
            .openWriter()) {
      writer.write("/** @externs */\n\n");
      for (JsTypeApi api : exportedTypes) {
        writer.write("/** @constructor */\nfunction " + api.jsName + "() {}\n\n");
        for (Map.Entry<String, MemberKind> member : api.members.entrySet()) {
          writer.write(api.jsName + ".prototype." + member.getKey());
          if (member.getValue() == MemberKind.METHOD) {
            writer.write(" = function() {}");
          }
          writer.write(";\n");
        }
        writer.write("\n");
      }
    }
  }

  private String readJsName(Element element, String annotationName, String fallback) {
    AnnotationMirror annotation = findAnnotation(element, annotationName);
    if (annotation == null) {
      return null;
    }
    String name = annotationValue(annotation, "name");
    return name == null || name.isEmpty() || "<auto>".equals(name) ? fallback : name;
  }

  private AnnotationMirror findAnnotation(Element element, String annotationName) {
    for (AnnotationMirror annotation : element.getAnnotationMirrors()) {
      if (annotation.getAnnotationType().toString().equals(annotationName)) {
        return annotation;
      }
    }
    return null;
  }

  private String annotationValue(AnnotationMirror annotation, String name) {
    for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> value :
        processingEnv.getElementUtils().getElementValuesWithDefaults(annotation).entrySet()) {
      if (value.getKey().getSimpleName().contentEquals(name)) {
        return String.valueOf(value.getValue().getValue());
      }
    }
    return null;
  }

  private void error(Element element, String message) {
    processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, message, element);
  }

  private enum MemberKind {
    METHOD,
    PROPERTY
  }

  private static final class JsTypeApi {
    private final String qualifiedName;
    private final String jsName;
    private final Map<String, MemberKind> members;

    private JsTypeApi(String qualifiedName, String jsName, Map<String, MemberKind> members) {
      this.qualifiedName = qualifiedName;
      this.jsName = jsName;
      this.members = members;
    }
  }
}
