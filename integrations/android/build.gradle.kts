import com.android.build.api.dsl.ApplicationExtension
import com.android.build.api.dsl.LibraryExtension
import com.android.build.api.dsl.Lint
import com.android.build.api.dsl.TestExtension
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.gradle.tasks.JavaDocGenerationTask
import dev.detekt.gradle.extensions.DetektExtension
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.tasks.bundling.AbstractArchiveTask
import org.gradle.api.tasks.compile.JavaCompile
import org.gradle.api.tasks.testing.Test
import org.jetbrains.kotlin.gradle.tasks.KotlinCompilationTask

// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "9.4.0" apply false
    id("com.android.library") version "9.4.0" apply false
    id("com.android.test") version "9.4.0" apply false
    id("com.android.legacy-kapt") version "9.4.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.4.10" apply false
    id("com.vanniktech.maven.publish") version "0.37.0" apply false
    id("com.diffplug.spotless") version "8.10.2"
    id("dev.detekt") version "2.0.0-alpha.6" apply false
}

val angularTsVersion =
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")
        .find(file("../../package.json").readText())
        ?.groupValues
        ?.get(1) ?: error("Unable to read the AngularTS version from package.json")
val robolectricMaxSdk = 36
val angularTsStagingRepository = providers.gradleProperty("angularTsStagingRepository")

allprojects {
    group = "io.github.angular-wave"
    version = angularTsVersion
}

spotless {
    kotlin {
        target("**/*.kt")
        targetExclude("**/build/**")
        ktfmt("0.63").kotlinlangStyle()
        trimTrailingWhitespace()
        endWithNewline()
    }
    kotlinGradle {
        target("**/*.gradle.kts")
        targetExclude("**/build/**")
        ktfmt("0.63").kotlinlangStyle()
        trimTrailingWhitespace()
        endWithNewline()
    }
}

fun Lint.enforceStrictChecks() {
    abortOnError = true
    absolutePaths = false
    checkAllWarnings = true
    checkDependencies = true
    checkGeneratedSources = true
    checkReleaseBuilds = true
    checkTestSources = true
    explainIssues = true
    ignoreTestFixturesSources = false
    ignoreTestSources = false
    noLines = false
    quiet = false
    warningsAsErrors = true
}

subprojects {
    tasks.withType<AbstractArchiveTask>().configureEach {
        isPreserveFileTimestamps = false
        isReproducibleFileOrder = true
    }

    plugins.withId("maven-publish") {
        angularTsStagingRepository.orNull?.let { repository ->
            extensions.configure<PublishingExtension> {
                repositories {
                    maven {
                        name = "angularTsStaging"
                        url = uri(repository)
                    }
                }
            }
        }
    }

    if (name != "native-elements-compiler") {
        apply(plugin = "dev.detekt")
        extensions.configure<DetektExtension> {
            allRules = true
            buildUponDefaultConfig = true
            config.setFrom(rootProject.file("config/detekt/detekt.yml"))
            ignoreFailures = false
            parallel = true
        }
    }

    tasks.withType<KotlinCompilationTask<*>>().configureEach {
        compilerOptions {
            allWarningsAsErrors.set(true)
            freeCompilerArgs.addAll(
                "-Wextra",
                "-Xconsistent-data-class-copy-visibility",
                "-Xjspecify-annotations=strict",
                "-Xjsr305=strict",
            )
            progressiveMode.set(true)
        }
    }

    tasks.withType<JavaCompile>().configureEach {
        options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
    }

    tasks.withType<Test>().configureEach {
        jvmArgs("--add-exports=java.base/jdk.internal.access=ALL-UNNAMED")
    }

    tasks.withType<JavaDocGenerationTask>().configureEach {
        doLast {
            fileTree(outputDirectory)
                .matching { include("**/*.html") }
                .forEach { documentation ->
                    val generated = documentation.readText()
                    val normalized =
                        generated.replace(
                            "https://developer.android.com/reference/kotlin/java/",
                            "https://docs.oracle.com/javase/8/docs/api/java/",
                        )
                    if (normalized != generated) documentation.writeText(normalized)
                }
        }
    }

    plugins.withId("com.android.application") {
        extensions.configure<ApplicationExtension> { lint.enforceStrictChecks() }
    }
    plugins.withId("com.android.library") {
        extensions.configure<LibraryExtension> { lint.enforceStrictChecks() }
        extensions.configure<LibraryAndroidComponentsExtension> {
            finalizeDsl { extension -> extension.testOptions.targetSdk = robolectricMaxSdk }
        }
    }
    plugins.withId("com.android.test") {
        extensions.configure<TestExtension> { lint.enforceStrictChecks() }
    }
}

tasks.register("printVersion") {
    doLast { println(angularTsVersion) }
}
