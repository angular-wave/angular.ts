package org.angular.ts.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a global JsType whose public instance fields and methods are used by template expressions.
 * Members are exported automatically unless annotated with {@code JsIgnore}.
 */
@Retention(RetentionPolicy.SOURCE)
@Target(ElementType.TYPE)
public @interface AngularTemplateApi {}
