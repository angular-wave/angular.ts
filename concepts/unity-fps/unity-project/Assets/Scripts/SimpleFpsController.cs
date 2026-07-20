using UnityEngine;

namespace AngularTsConcept
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class SimpleFpsController : MonoBehaviour
    {
        [SerializeField]
        private Camera playerCamera;

        [SerializeField]
        private AngularTsFpsBridge bridge;

        [SerializeField]
        private float moveSpeed = 6f;

        [SerializeField]
        private float gravity = -18f;

        [SerializeField]
        private float mouseSensitivity = 1f;

        private CharacterController character;
        private Vector3 velocity;
        private float pitch;
        private bool paused;
        private int health = 100;
        private int ammo = 30;
        private int reserve = 90;
        private int targetsDestroyed;
        private float damageTimer;

        public void SetPaused(bool value)
        {
            paused = value;
            Time.timeScale = paused ? 0f : 1f;
            Cursor.lockState = paused ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = paused;
            bridge?.NotifyEvent(paused ? "paused" : "resumed");
            bridge?.NotifyState();
        }

        public void SetSensitivity(float value)
        {
            mouseSensitivity = Mathf.Clamp(value, 0.4f, 2f);
        }

        public void Reload()
        {
            if (ammo >= 30 || reserve <= 0) return;

            var needed = 30 - ammo;
            var loaded = Mathf.Min(needed, reserve);
            ammo += loaded;
            reserve -= loaded;
            bridge?.NotifyEvent("reloaded");
            bridge?.NotifyState();
        }

        public void Heal()
        {
            health = 100;
            bridge?.NotifyEvent("healed");
            bridge?.NotifyState();
        }

        public void Shoot()
        {
            if (paused) return;

            Fire();
        }

        public string CreateStateJson()
        {
            return "{\"health\":" + health
                + ",\"ammo\":" + ammo
                + ",\"reserve\":" + reserve
                + ",\"targetsDestroyed\":" + targetsDestroyed
                + "}";
        }

        private void Awake()
        {
            character = GetComponent<CharacterController>();
            if (playerCamera == null)
            {
                playerCamera = GetComponentInChildren<Camera>();
            }
        }

        private void Start()
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
            bridge?.Attach(this);
            bridge?.NotifyReady();
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                SetPaused(!paused);
            }

            if (paused) return;

            Look();
            Move();

            if (Input.GetMouseButtonDown(0))
            {
                Shoot();
            }

            if (Input.GetKeyDown(KeyCode.R))
            {
                Reload();
            }

            damageTimer += Time.deltaTime;
            if (damageTimer > 4f)
            {
                damageTimer = 0f;
                health = Mathf.Max(0, health - 3);
                bridge?.NotifyState();
            }
        }

        private void Look()
        {
            var yaw = Input.GetAxis("Mouse X") * mouseSensitivity * 3f;
            var pitchDelta = Input.GetAxis("Mouse Y") * mouseSensitivity * 3f;

            transform.Rotate(Vector3.up * yaw);
            pitch = Mathf.Clamp(pitch - pitchDelta, -80f, 80f);
            playerCamera.transform.localRotation = Quaternion.Euler(pitch, 0f, 0f);
        }

        private void Move()
        {
            var input = new Vector3(Input.GetAxis("Horizontal"), 0f, Input.GetAxis("Vertical"));
            input = Vector3.ClampMagnitude(input, 1f);
            var movement = transform.TransformDirection(input) * moveSpeed;

            if (character.isGrounded && velocity.y < 0f)
            {
                velocity.y = -2f;
            }

            velocity.y += gravity * Time.deltaTime;
            character.Move((movement + velocity) * Time.deltaTime);
        }

        private void Fire()
        {
            if (ammo <= 0)
            {
                bridge?.NotifyEvent("empty");
                return;
            }

            ammo -= 1;

            if (Physics.Raycast(playerCamera.transform.position, playerCamera.transform.forward, out var hit, 80f))
            {
                var target = hit.collider.GetComponent<TargetDummy>();
                if (target != null)
                {
                    target.Hit();
                    targetsDestroyed += 1;
                    bridge?.NotifyEvent("target-destroyed");
                }
                else
                {
                    bridge?.NotifyEvent("shot");
                }
            }
            else
            {
                bridge?.NotifyEvent("shot");
            }

            bridge?.NotifyState();
        }
    }
}
