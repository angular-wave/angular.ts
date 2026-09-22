import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("com.vanniktech.maven.publish")
}

android {
    namespace = "io.github.angularwave.android.paging"
    compileSdk = 37

    defaultConfig {
        minSdk = 28
    }

    buildTypes {
        release { consumerProguardFiles("consumer-rules.pro") }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
        targetSdk = 37
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    api(project(":navigation-fragments"))
    api("androidx.paging:paging-runtime-ktx:3.5.1")
    implementation("androidx.recyclerview:recyclerview:1.4.0")

    testImplementation("androidx.test:core:1.7.0")
    testImplementation("org.assertj:assertj-core:3.27.7")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.11.0")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("junit:junit:4.13.2")
}

mavenPublishing {
    configure(
        AndroidSingleVariantLibrary(
            javadocJar = JavadocJar.Javadoc(),
            sourcesJar = SourcesJar.Sources(),
            variant = "release",
        )
    )
    coordinates("io.github.angular-wave", "angular-native-paging", version.toString())
    publishToMavenCentral()
    if (project.hasProperty("signingInMemoryKey")) signAllPublications()
    pom {
        name.set("Angular Native for Android - Paging")
        description.set("Optional Paging 3 collections for Angular Native")
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
