package org.angular.ts.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Marks the public static method invoked by the generated Closure entry module. */
@Retention(RetentionPolicy.SOURCE)
@Target(ElementType.METHOD)
public @interface AngularEntryPoint {}
