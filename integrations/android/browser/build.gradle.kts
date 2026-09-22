import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar

plugins {
    id("com.android.library")
    id("com.android.legacy-kapt")
    id("com.vanniktech.maven.publish")
}

android {
    namespace = "io.github.angularwave.android.browser"
    compileSdk = 37
    packaging.jniLibs.keepDebugSymbols.add("**/libandroidx.graphics.path.so")
    defaultConfig {
        minSdk = 28
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release { consumerProguardFiles("consumer-rules.pro") }
    }
}

dependencies {
    api(project(":navigation-fragments"))
    implementation("androidx.browser:browser:1.10.0")
    implementation("androidx.startup:startup-runtime:1.2.0")
    implementation("com.google.android.material:material:1.14.0")
    kapt(project(":native-elements-compiler"))
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
    coordinates("io.github.angular-wave", "angular-native-browser", version.toString())
    publishToMavenCentral()
    if (project.hasProperty("signingInMemoryKey")) signAllPublications()
    pom {
        name.set("Angular Native for Android - Browser")
        description.set("Optional Android Custom Tabs routing for Angular Native")
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
