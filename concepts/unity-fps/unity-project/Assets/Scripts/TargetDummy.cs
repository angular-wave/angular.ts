using UnityEngine;

namespace AngularTsConcept
{
    public sealed class TargetDummy : MonoBehaviour
    {
        private Vector3 initialPosition;
        private Renderer targetRenderer;

        private void Awake()
        {
            initialPosition = transform.position;
            targetRenderer = GetComponent<Renderer>();
        }

        public void Hit()
        {
            transform.position = new Vector3(
                Random.Range(-8f, 8f),
                initialPosition.y,
                Random.Range(8f, 22f)
            );

            if (targetRenderer != null)
            {
                targetRenderer.material.color = Random.ColorHSV(0f, 1f, 0.65f, 1f, 0.8f, 1f);
            }
        }
    }
}
