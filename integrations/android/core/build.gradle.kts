import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.vanniktech.maven.publish")
}

val libVersionName = version.toString()
val libraryName = "Angular Native for Android - Core"
val libraryDescription = "Android runtime for server-rendered AngularTS applications"

val publishedGroupId = "io.github.angular-wave"
val publishedArtifactId = "angular-native-core"

val siteUrl = "https://github.com/angular-wave/angular.ts"
val gitUrl = "https://github.com/angular-wave/angular.ts.git"

val licenseType = "MIT License"
val licenseUrl = "https://github.com/angular-wave/angular.ts/blob/master/LICENSE"

val developerId = "angular-wave"

android {
    namespace = "io.github.angularwave.android.core"
    compileSdk = 37

    packaging.jniLibs.keepDebugSymbols.add("**/libandroidx.graphics.path.so")

    testOptions.unitTests.isIncludeAndroidResources = true
    defaultConfig {
        minSdk = 28
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            consumerProguardFiles("proguard-consumer-rules.pro")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets {
        named("main") {
            java.directories.clear()
            java.directories.add("src/main/kotlin")
        }
        named("test") {
            java.directories.clear()
            java.directories.add("src/test/kotlin")
        }
        named("debug") {
            java.directories.clear()
            java.directories.add("src/debug/kotlin")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect:2.4.10")

    // Material
    implementation("com.google.android.material:material:1.14.0")

    // AndroidX
    implementation("androidx.constraintlayout:constraintlayout:2.2.2")
    implementation("androidx.lifecycle:lifecycle-common:2.11.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.2.0")

    // JSON
    implementation("com.google.code.gson:gson:2.14.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")

    // Networking/API
    implementation("com.squareup.okhttp3:okhttp:5.5.0")
    implementation("com.squareup.okhttp3:okhttp-coroutines:5.5.0")
    implementation("com.squareup.okhttp3:logging-interceptor:5.5.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.11.0")

    // Exported AndroidX dependencies
    api("androidx.appcompat:appcompat:1.8.0")
    api("androidx.core:core-ktx:1.19.0")
    api("androidx.webkit:webkit:1.17.0")

    // Tests
    testImplementation("androidx.test:core:1.7.0") // Robolectric
    testImplementation("androidx.navigation:navigation-testing:2.10.1")
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.11.0")
    testImplementation("org.assertj:assertj-core:3.27.7")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("org.mockito:mockito-core:5.23.0")
    testImplementation("com.nhaarman:mockito-kotlin:1.6.0")
    testImplementation("com.squareup.okhttp3:mockwebserver:5.5.0")
    testImplementation("junit:junit:4.13.2")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

// Publish to Maven Central via:
//   ./gradlew clean build publishAndReleaseToMavenCentral --no-configuration-cache
//   expected env variables:
// https://vanniktech.github.io/gradle-maven-publish-plugin/central/#secrets
//   https://central.sonatype.com/artifact/io.github.angular-wave/angular-native-core

mavenPublishing {
    configure(
        AndroidSingleVariantLibrary(
            javadocJar = JavadocJar.Javadoc(),
            sourcesJar = SourcesJar.Sources(),
            variant = "release",
        )
    )

    coordinates(
        groupId = publishedGroupId,
        artifactId = publishedArtifactId,
        version = libVersionName,
    )

    publishToMavenCentral()

    // Sign only if signingInMemoryKey is defined
    if (project.hasProperty("signingInMemoryKey")) {
        signAllPublications()
    }

    pom {
        name.set(libraryName)
        description.set(libraryDescription)
        url.set(siteUrl)

        licenses {
            license {
                name.set(licenseType)
                url.set(licenseUrl)
            }
        }

        developers {
            developer {
                id.set(developerId)
                name.set(developerId)
            }
        }

        scm {
            url.set(gitUrl)
        }
    }
}
