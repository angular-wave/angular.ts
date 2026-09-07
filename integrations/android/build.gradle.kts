// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "9.2.1" apply false
    id("com.android.library") version "9.2.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.0" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.3.0" apply false
    id("com.vanniktech.maven.publish") version "0.32.0" apply false
}

val angularTsVersion = Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")
    .find(file("../../package.json").readText())
    ?.groupValues
    ?.get(1)
    ?: error("Unable to read the AngularTS version from package.json")

allprojects {
    group = "io.github.angular-wave"
    version = angularTsVersion
}

tasks.register("printVersion") {
    doLast { println(angularTsVersion) }
}
