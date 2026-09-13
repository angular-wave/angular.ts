import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "io.github.angularwave.android.demo"
    compileSdk = 37

    packaging.jniLibs.keepDebugSymbols.add("**/libandroidx.graphics.path.so")

    defaultConfig {
        applicationId = "io.github.angularwave.android.demo"
        minSdk = 28
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }

        getByName("debug") {
            isDebuggable = true
        }

        create("benchmark") {
            initWith(getByName("release"))
            signingConfig = signingConfigs.getByName("debug")
            matchingFallbacks += listOf("release")
            isDebuggable = false
        }
    }

    buildFeatures {
        viewBinding = true
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
    implementation(project(":core"))
    implementation(project(":navigation-fragments"))
    implementation(project(":browser"))

    // Material
    implementation("com.google.android.material:material:1.14.0")

    // AndroidX
    implementation("androidx.constraintlayout:constraintlayout:2.2.2")
    implementation("androidx.recyclerview:recyclerview:1.4.0")

    // JSON
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")

    // Images
    implementation("io.coil-kt:coil:2.7.0")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
