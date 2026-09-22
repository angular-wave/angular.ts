plugins {
    id("com.android.application") version "9.4.1"
}

val angularTsVersion = providers.gradleProperty("angularTsVersion").get()

android {
    namespace = "io.github.angularwave.android.consumer"
    compileSdk = 37
    defaultConfig {
        applicationId = "io.github.angularwave.android.consumer"
        minSdk = 28
        targetSdk = 37
        versionCode = 1
        versionName = angularTsVersion
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
    testOptions { unitTests.isIncludeAndroidResources = true }
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

tasks.withType<Test>().configureEach {
    jvmArgs("--add-exports=java.base/jdk.internal.access=ALL-UNNAMED")
}

dependencies {
    implementation("io.github.angular-wave:angular-native-core:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-navigation:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-browser:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-credentials:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-custom-elements-sample:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-maps:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-media:$angularTsVersion")
    implementation("io.github.angular-wave:angular-native-paging:$angularTsVersion")
    annotationProcessor("io.github.angular-wave:angular-native-elements-compiler:$angularTsVersion")
    testImplementation("androidx.startup:startup-runtime:1.2.0")
    testImplementation("androidx.test:core:1.7.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
}
