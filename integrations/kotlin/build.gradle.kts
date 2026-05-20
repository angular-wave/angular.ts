plugins {
    kotlin("multiplatform") version "1.9.23"
    `maven-publish`
}

group = "dev.angularwave"
version = "0.27.0-SNAPSHOT"

repositories {
    mavenCentral()
}

publishing {
    publications.withType<MavenPublication>().configureEach {
        pom {
            name.set("AngularTS Kotlin")
            description.set("Kotlin/JS facade for authoring AngularTS applications.")
            url.set("https://github.com/angular-wave/angular.ts")

            licenses {
                license {
                    name.set("MIT")
                    url.set("https://opensource.org/licenses/MIT")
                }
            }

            developers {
                developer {
                    id.set("angular-wave")
                    name.set("Angular Wave")
                }
            }

            scm {
                connection.set("scm:git:https://github.com/angular-wave/angular.ts.git")
                developerConnection.set("scm:git:ssh://git@github.com/angular-wave/angular.ts.git")
                url.set("https://github.com/angular-wave/angular.ts")
            }
        }
    }
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
                implementation(npm("@angular-wave/angular.ts", "file:../../../../../.."))
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
