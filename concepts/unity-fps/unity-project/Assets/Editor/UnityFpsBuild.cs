using System.IO;
using AngularTsConcept;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace AngularTsConcept.Editor
{
    public static class UnityFpsBuild
    {
        private const string ScenePath = "Assets/Scenes/AngularTsFps.unity";

        public static void Build()
        {
            CreateScene();
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.template = "APPLICATION:Default";
            PlayerSettings.companyName = "AngularTS";
            PlayerSettings.productName = "AngularTS Unity FPS Concept";
            PlayerSettings.bundleVersion = "0.1.0";

            var stagingPath = Path.GetFullPath(Path.Combine(
                Application.dataPath,
                "../../BuildOutput"
            ));
            var hostBuildPath = Path.GetFullPath(Path.Combine(
                Application.dataPath,
                "../../Build"
            ));

            ResetDirectory(stagingPath);
            ResetDirectory(hostBuildPath);

            var report = BuildPipeline.BuildPlayer(
                new[] { ScenePath },
                stagingPath,
                BuildTarget.WebGL,
                BuildOptions.None
            );

            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new BuildFailedException("Unity FPS WebGL build failed: " + report.summary.result);
            }

            CopyWebGlBuild(stagingPath, hostBuildPath);
        }

        public static void CreateScene()
        {
            Directory.CreateDirectory("Assets/Scenes");

            var scene = UnityEditor.SceneManagement.EditorSceneManager.NewScene(
                UnityEditor.SceneManagement.NewSceneSetup.EmptyScene,
                UnityEditor.SceneManagement.NewSceneMode.Single
            );

            RenderSettings.skybox = null;
            RenderSettings.ambientLight = new Color(0.35f, 0.4f, 0.5f);

            CreateFloor();
            CreateWalls();
            CreateTargets();
            CreatePlayer();
            CreateLight();

            UnityEditor.SceneManagement.EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true),
            };
        }

        private static void CreatePlayer()
        {
            var player = new GameObject("Player");
            player.transform.position = new Vector3(0f, 1.1f, -8f);
            var character = player.AddComponent<CharacterController>();
            character.height = 1.8f;
            character.radius = 0.35f;
            character.center = new Vector3(0f, 0.9f, 0f);

            var cameraObject = new GameObject("Camera");
            cameraObject.transform.SetParent(player.transform);
            cameraObject.transform.localPosition = new Vector3(0f, 1.55f, 0f);
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.08f, 0.1f, 0.14f);
            camera.fieldOfView = 72f;
            camera.nearClipPlane = 0.03f;

            var bridgeObject = new GameObject("AngularTsBridge");
            var bridge = bridgeObject.AddComponent<AngularTsFpsBridge>();
            var controller = player.AddComponent<SimpleFpsController>();

            var controllerProperty = new SerializedObject(controller);
            controllerProperty.FindProperty("playerCamera").objectReferenceValue = camera;
            controllerProperty.FindProperty("bridge").objectReferenceValue = bridge;
            controllerProperty.ApplyModifiedPropertiesWithoutUndo();

            var bridgeProperty = new SerializedObject(bridge);
            bridgeProperty.FindProperty("controller").objectReferenceValue = controller;
            bridgeProperty.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void CreateFloor()
        {
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Arena Floor";
            floor.transform.position = new Vector3(0f, -0.05f, 8f);
            floor.transform.localScale = new Vector3(24f, 0.1f, 36f);
            floor.GetComponent<Renderer>().material.color = new Color(0.12f, 0.15f, 0.2f);
        }

        private static void CreateWalls()
        {
            CreateWall("Back Wall", new Vector3(0f, 2f, 26f), new Vector3(24f, 4f, 0.3f));
            CreateWall("Left Wall", new Vector3(-12f, 2f, 8f), new Vector3(0.3f, 4f, 36f));
            CreateWall("Right Wall", new Vector3(12f, 2f, 8f), new Vector3(0.3f, 4f, 36f));
        }

        private static void CreateWall(string name, Vector3 position, Vector3 scale)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = name;
            wall.transform.position = position;
            wall.transform.localScale = scale;
            wall.GetComponent<Renderer>().material.color = new Color(0.2f, 0.24f, 0.32f);
        }

        private static void CreateTargets()
        {
            for (var index = 0; index < 6; index += 1)
            {
                var target = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                target.name = "Target " + (index + 1);
                target.transform.position = new Vector3(-7.5f + index * 3f, 2.65f, 10f + index * 2f);
                target.transform.localScale = Vector3.one * 1.1f;
                target.GetComponent<Renderer>().material.color = new Color(0.9f, 0.18f, 0.18f);
                target.AddComponent<TargetDummy>();
            }

            var centerTarget = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            centerTarget.name = "Center Target";
            centerTarget.transform.position = new Vector3(0f, 2.65f, 14f);
            centerTarget.transform.localScale = Vector3.one * 1.35f;
            centerTarget.GetComponent<Renderer>().material.color = new Color(1f, 0.28f, 0.1f);
            centerTarget.AddComponent<TargetDummy>();
        }

        private static void CreateLight()
        {
            var lightObject = new GameObject("Directional Light");
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
        }

        private static void CopyWebGlBuild(string stagingPath, string hostBuildPath)
        {
            var generatedBuildPath = Path.Combine(stagingPath, "Build");

            CopyFirst(generatedBuildPath, "*.loader.js", hostBuildPath, "unity-fps.loader.js");
            CopyFirst(generatedBuildPath, "*.data", hostBuildPath, "unity-fps.data");
            CopyFirst(generatedBuildPath, "*.framework.js", hostBuildPath, "unity-fps.framework.js");
            CopyFirst(generatedBuildPath, "*.wasm", hostBuildPath, "unity-fps.wasm");
        }

        private static void CopyFirst(string sourceDirectory, string pattern, string targetDirectory, string targetName)
        {
            var matches = Directory.GetFiles(sourceDirectory, pattern);
            if (matches.Length == 0)
            {
                throw new FileNotFoundException("Unity WebGL build did not emit " + pattern);
            }

            File.Copy(matches[0], Path.Combine(targetDirectory, targetName), true);
        }

        private static void ResetDirectory(string path)
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }

            Directory.CreateDirectory(path);
        }
    }
}
