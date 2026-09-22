import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("com.android.legacy-kapt")
    id("com.vanniktech.maven.publish")
}

android {
    namespace = "io.github.angularwave.android.credentials"
    compileSdk = 37
    defaultConfig {
        minSdk = 28
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes { release { consumerProguardFiles("consumer-rules.pro") } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions {
        unitTests.isIncludeAndroidResources = true
        targetSdk = 37
    }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

dependencies {
    api(project(":navigation-fragments"))
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("androidx.startup:startup-runtime:1.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    kapt(project(":native-elements-compiler"))
    testImplementation("androidx.test:core:1.7.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
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
    coordinates("io.github.angular-wave", "angular-native-credentials", version.toString())
    publishToMavenCentral()
    if (project.hasProperty("signingInMemoryKey")) signAllPublications()
    pom {
        name.set("Angular Native for Android - Credentials")
        description.set("Optional Android Credential Manager support for Angular Native")
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
