pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version ("0.10.0")
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "angular-native-android"

include(":core")

include(":browser")

include(":benchmark")

include(":custom-elements-sample")

include(":demo")

include(":sample-social")

include(":navigation-fragments")

include(":native-elements-compiler")

include(":paging")

include(":media")

include(":credentials")

include(":maps")
