ThisBuild / scalaVersion := "3.3.3"
ThisBuild / organization := "io.github.angular-ts"
lazy val angularTsRuntimeVersion = settingKey[String](
  "AngularTS npm package version this Scala.js facade build targets.",
)

ThisBuild / version := angularTsRuntimeVersion.value
ThisBuild / description := "Scala.js facades for AngularTS"
ThisBuild / licenses := Seq("MIT" -> url("https://opensource.org/licenses/MIT"))

ThisBuild / angularTsRuntimeVersion := {
  val packageJson = IO.read(baseDirectory.value / ".." / ".." / "package.json")
  val versionPattern = """"version"\s*:\s*"([^"]+)"""".r

  versionPattern
    .findFirstMatchIn(packageJson)
    .map(_.group(1))
    .getOrElse(sys.error("Unable to read AngularTS version from package.json"))
}

lazy val commonSettings = Seq(
  libraryDependencies ++= Seq(
    "org.scala-js" %%% "scalajs-dom" % "2.8.0",
    "org.scalameta" %%% "munit" % "1.0.0" % Test,
  ),
  testFrameworks += new TestFramework("munit.Framework"),
  scalacOptions ++= Seq(
    "-deprecation",
    "-feature",
    "-unchecked",
    "-Wunused:all",
    "-Wvalue-discard",
  ),
  Compile / doc / scalacOptions ++= Seq(
    "-doc-title",
    "AngularTS Scala.js Facades",
    "-doc-version",
    version.value,
    "-groups",
  ),
)

lazy val angularTsScala =
  project
    .in(file("."))
    .enablePlugins(ScalaJSPlugin)
    .settings(commonSettings)
    .settings(
      name := "angular-ts-scalajs",
      scalaJSUseMainModuleInitializer := false,
      publishMavenStyle := true,
      Compile / scalaSource := baseDirectory.value / "src" / "main" / "scala",
      Test / scalaSource := baseDirectory.value / "src" / "test" / "scala",
    )

lazy val basicApp =
  project
    .in(file("examples/basic_app"))
    .enablePlugins(ScalaJSPlugin)
    .dependsOn(angularTsScala)
    .settings(commonSettings)
    .settings(
      name := "angular-ts-scala-basic-app",
      scalaJSUseMainModuleInitializer := true,
      publish / skip := true,
    )
