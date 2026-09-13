plugins {
    id("com.android.application")
}

android {
    namespace = "io.github.angularwave.android.samples.pulse"
    compileSdk = 37

    defaultConfig {
        applicationId = "io.github.angularwave.android.samples.pulse"
        minSdk = 28
        targetSdk = 37
        versionCode = 1
        versionName = version.toString()
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
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
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.addAll(listOf("-Xlint:all,-classfile,-processing", "-Werror"))
}

dependencies {
    implementation(project(":navigation-fragments"))
    implementation("com.google.android.material:material:1.14.0")

    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.4.0")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}
