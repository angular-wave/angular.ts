plugins {
    `java-library`
    id("com.vanniktech.maven.publish")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(17))
}

dependencies {
    testImplementation("com.google.testing.compile:compile-testing:0.23.0")
    testImplementation("junit:junit:4.13.2")
}

mavenPublishing {
    coordinates(
        groupId = "io.github.angular-wave",
        artifactId = "angular-native-elements-compiler",
        version = version.toString(),
    )
    publishToMavenCentral()
    if (project.hasProperty("signingInMemoryKey")) signAllPublications()
    pom {
        name.set("Angular Native element metadata compiler")
        description.set("Generates provider discovery metadata for Angular Native Android elements")
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
