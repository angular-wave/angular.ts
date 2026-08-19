package org.angular.ts.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Marks a global JsType whose public JsInterop members are used by template expressions. */
@Retention(RetentionPolicy.SOURCE)
@Target(ElementType.TYPE)
public @interface AngularTemplateApi {}
