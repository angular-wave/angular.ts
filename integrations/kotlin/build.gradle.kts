plugins {
    kotlin("multiplatform") version "1.9.23"
}

group = "dev.angularwave"
version = "0.27.0-SNAPSHOT"

repositories {
    mavenCentral()
}

kotlin {
    explicitApi()

    js(IR) {
        browser {
            testTask {
                useKarma {
                    useChromeHeadless()
                }
            }
        }
        binaries.executable()
    }

    sourceSets {
        val jsMain by getting {
            dependencies {
                implementation(npm("@angular-wave/angular.ts", "file:../.."))
            }
        }

        val jsTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
    }
}

val kotlinSourceFiles = fileTree("src") {
    include("**/*.kt")
}

tasks.register("formatKotlin") {
    group = "formatting"
    description = "Formats Kotlin sources when a formatter is configured."

    doLast {
        logger.lifecycle("No Kotlin formatter is configured yet; leaving sources unchanged.")
    }
}

tasks.register("checkKotlinFormat") {
    group = "verification"
    description = "Checks lightweight Kotlin source formatting constraints."
    inputs.files(kotlinSourceFiles)

    doLast {
        val filesWithTabs = kotlinSourceFiles.files.filter { file ->
            file.readText().contains('\t')
        }

        if (filesWithTabs.isNotEmpty()) {
            error(
                "Kotlin sources must not contain tab indentation:\n" +
                    filesWithTabs.joinToString("\n") { "- ${it.relativeTo(projectDir)}" },
            )
        }
    }
}
