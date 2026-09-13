import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.Sync
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

abstract class PackageProviderMetadata : Sync() {
    @get:OutputDirectory abstract val outputDirectory: DirectoryProperty
}

plugins {
    id("com.android.library")
    id("com.android.legacy-kapt")
    id("com.vanniktech.maven.publish")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "io.github.angularwave.android.sample.elements"
    compileSdk = 37

    packaging.jniLibs.keepDebugSymbols.add("**/libandroidx.graphics.path.so")

    defaultConfig {
        minSdk = 28
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes { release { consumerProguardFiles("consumer-rules.pro") } }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures { compose = true }
}

val packageReleaseProviderMetadata =
    tasks.register<PackageProviderMetadata>("packageReleaseProviderMetadata") {
        dependsOn("kaptReleaseKotlin")
        from(
            layout.buildDirectory.dir(
                "intermediates/built_in_kapt_classes_dir/release/kaptReleaseKotlin/META-INF/services"
            )
        ) {
            into("META-INF/services")
        }
        outputDirectory.set(layout.buildDirectory.dir("generated/native-provider-metadata/release"))
        into(outputDirectory)
    }

androidComponents.onVariants(androidComponents.selector().withBuildType("release")) { variant ->
    variant.sources.resources?.addGeneratedSourceDirectory(
        packageReleaseProviderMetadata,
        PackageProviderMetadata::outputDirectory,
    )
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":navigation-fragments"))
    implementation("androidx.startup:startup-runtime:1.2.0")
    kapt(project(":native-elements-compiler"))
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
}

mavenPublishing {
    configure(
        AndroidSingleVariantLibrary(
            javadocJar = JavadocJar.Javadoc(),
            sourcesJar = SourcesJar.Sources(),
            variant = "release",
        )
    )
    coordinates(
        "io.github.angular-wave",
        "angular-native-custom-elements-sample",
        version.toString(),
    )
    publishToMavenCentral()
    if (project.hasProperty("signingInMemoryKey")) signAllPublications()
    pom {
        name.set("Angular Native for Android - Custom Elements Sample")
        description.set("Example View and Compose components for Angular Native")
        url.set("https://github.com/angular-wave/angular.ts")
        licenses {
            license {
                name.set("MIT License")
                url.set("https://github.com/angular-wave/angular.ts/blob/master/LICENSE")
            }
        }
        developers {
            developer {
                id.set("angular-wave")
                name.set("angular-wave")
            }
        }
        scm { url.set("https://github.com/angular-wave/angular.ts.git") }
    }
}
