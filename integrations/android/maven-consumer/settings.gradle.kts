pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

val angularTsRepository = providers.gradleProperty("angularTsRepository")

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        if (angularTsRepository.isPresent) {
            exclusiveContent {
                forRepository {
                    maven {
                        name = "angularTsStaging"
                        url = uri(angularTsRepository.get())
                    }
                }
                filter { includeGroup("io.github.angular-wave") }
            }
        }
        google()
        mavenCentral()
    }
}

rootProject.name = "angular-native-maven-consumer"
