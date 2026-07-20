using System.Runtime.InteropServices;
using UnityEngine;

namespace AngularTsConcept
{
    public sealed class AngularTsFpsBridge : MonoBehaviour
    {
        [SerializeField]
        private SimpleFpsController controller;

        public void Attach(SimpleFpsController fpsController)
        {
            controller = fpsController;
        }

        public void SetPaused(string value)
        {
            if (controller == null) return;

            controller.SetPaused(value == "true");
        }

        public void SetSensitivity(string value)
        {
            if (controller == null) return;

            if (float.TryParse(value, out var sensitivity))
            {
                controller.SetSensitivity(sensitivity);
            }
        }

        public void Reload()
        {
            controller?.Reload();
        }

        public void Shoot()
        {
            controller?.Shoot();
        }

        public void Heal()
        {
            controller?.Heal();
        }

        public void NotifyReady()
        {
            SendReady();
            SendState(controller?.CreateStateJson() ?? "{}");
        }

        public void NotifyState()
        {
            if (controller == null) return;

            SendState(controller.CreateStateJson());
        }

        public void NotifyEvent(string type)
        {
            SendEvent("{\"type\":\"" + EscapeJson(type) + "\"}");
        }

        private static string EscapeJson(string value)
        {
            return (value ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        private static void SendReady()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            AngularTsFpsReady();
#else
            Debug.Log("AngularTS bridge ready");
#endif
        }

        private static void SendState(string json)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            AngularTsFpsState(json);
#else
            Debug.Log("AngularTS bridge state: " + json);
#endif
        }

        private static void SendEvent(string json)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            AngularTsFpsEvent(json);
#else
            Debug.Log("AngularTS bridge event: " + json);
#endif
        }

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void AngularTsFpsReady();

        [DllImport("__Internal")]
        private static extern void AngularTsFpsState(string json);

        [DllImport("__Internal")]
        private static extern void AngularTsFpsEvent(string json);
#endif
    }
}
