import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.SonatypeHost
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.vanniktech.maven.publish")
}

val libVersionName by extra(version as String)
val libraryName by extra("Angular Native for Android - Fragment Navigation")
val libraryDescription by extra("Native Android navigation for server-rendered AngularTS applications")

val publishedGroupId by extra("io.github.angular-wave")
val publishedArtifactId by extra("angular-native-navigation")

val siteUrl by extra("https://github.com/angular-wave/angular.ts")
val gitUrl by extra("https://github.com/angular-wave/angular.ts.git")

val licenseType by extra("MIT License")
val licenseUrl by extra("https://github.com/angular-wave/angular.ts/blob/master/LICENSE")

val developerId by extra("angular-wave")

android {
    namespace = "io.github.angularwave.android.navigation"
    compileSdk = 36

    testOptions.unitTests.isIncludeAndroidResources = true
    testOptions.unitTests.isReturnDefaultValues = true
    testOptions.targetSdk = 35

    defaultConfig {
        minSdk = 28

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            consumerProguardFiles("proguard-consumer-rules.pro")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets {
        named("main") { java.directories.clear(); java.directories.add("src/main/kotlin") }
        named("test") { java.directories.clear(); java.directories.add("src/test/kotlin") }
        named("debug") { java.directories.clear(); java.directories.add("src/debug/kotlin") }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":core"))

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect:2.3.0")

    // AndroidX
    implementation("androidx.constraintlayout:constraintlayout:2.2.1")
    implementation("androidx.lifecycle:lifecycle-common:2.10.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    // Material
    implementation("com.google.android.material:material:1.13.0")

    // Compose
    implementation(platform("androidx.compose:compose-bom:2026.05.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")

    // Browser
    implementation("androidx.browser:browser:1.10.0")

    // Exported AndroidX dependencies
    api("androidx.activity:activity-ktx:1.13.0")
    api("androidx.fragment:fragment-ktx:1.8.9")
    api("androidx.navigation:navigation-fragment-ktx:2.9.8")
    api("androidx.navigation:navigation-ui-ktx:2.9.8")

    // Tests
    testImplementation("androidx.test:core:1.7.0") // Robolectric
    testImplementation("org.assertj:assertj-core:3.26.3")
    testImplementation("androidx.navigation:navigation-testing:2.9.8")
    testImplementation("org.robolectric:robolectric:4.14.1")
    testImplementation("org.mockito:mockito-core:5.14.2")
    testImplementation("com.nhaarman:mockito-kotlin:1.6.0")
    testImplementation("junit:junit:4.13.2")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

// Publish to Maven Central via:
//   ./gradlew clean build publishAndReleaseToMavenCentral --no-configuration-cache
//   expected env variables: https://vanniktech.github.io/gradle-maven-publish-plugin/central/#secrets
//   https://central.sonatype.com/artifact/io.github.angular-wave/angular-native-navigation

mavenPublishing {
    configure(
        AndroidSingleVariantLibrary(
            variant = "release",
            sourcesJar = true,
            publishJavadocJar = false,
        )
    )

    coordinates(groupId = publishedGroupId, artifactId = publishedArtifactId, version = libVersionName)

    publishToMavenCentral(SonatypeHost.CENTRAL_PORTAL)

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
