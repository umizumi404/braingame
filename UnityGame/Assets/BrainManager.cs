using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NativeWebSocket;
using UnityEngine.UI;

public class BrainManager : MonoBehaviour
{
    private WebSocket ws;

    // Link these squares in the Inspector
    public Image blinkSquare;
    public Image jawSquare;

    // To track the "cooldown" or "pulse" duration
    private float blinkTimer = 0f;
    private float jawTimer = 0f;
    public float displayDuration = 1.0f; // 1 second

    async void Start()
    {
        // Connect to the Node.js server
        ws = new WebSocket("ws://localhost:3000");

        ws.OnOpen += () => {
            Debug.Log("Connected to WebSocket server");
        };

        ws.OnError += (e) => {
            Debug.LogError("WS Error: " + e);
        };

        ws.OnClose += (e) => {
            Debug.Log("WS connection closed");
        };

        ws.OnMessage += (bytes) => {
            // Convert message to string
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            // Parse JSON
            // e.g. {"type": "BLINK"}
            try
            {
                Debug.Log("Message from server: " + message);
                var evt = JsonUtility.FromJson<DetectionEvent>(message);

                if (evt.type == "BLINK")
                {
                    // Turn blink square red, set blinkTimer
                    //blinkSquare.GetComponent<Renderer>().material.color = Color.red;
                    blinkSquare.color = Color.red;
                    blinkTimer = displayDuration;
                }
                else if (evt.type == "JAW")
                {
                    // Turn jaw square purple, set jawTimer
                    //jawSquare.GetComponent<Renderer>().material.color = Color.magenta;
                    jawSquare.color = Color.blue;
                    jawTimer = displayDuration;
                }
            }
            catch
            {
                Debug.LogWarning("Unrecognized or invalid JSON");
            }
        };

        await ws.Connect();
    }

    void Update()
    {
        // Required to process messages on the Unity main thread
        if (ws != null)
        {
#if !UNITY_WEBGL || UNITY_EDITOR
            ws.DispatchMessageQueue();
#endif
        }

        // Countdown timers for blink/jaw squares
        if (blinkTimer > 0f)
        {
            blinkTimer -= Time.deltaTime;
            if (blinkTimer <= 0f)
            {
                // Reset color
                //blinkSquare.GetComponent<Renderer>().material.color = Color.white;
                blinkSquare.color = Color.white;
            }
        }

        if (jawTimer > 0f)
        {
            jawTimer -= Time.deltaTime;
            if (jawTimer <= 0f)
            {
                //jawSquare.GetComponent<Renderer>().material.color = Color.white;
                jawSquare.color = Color.white;

            }
        }
    }

    private async void OnApplicationQuit()
    {
        if (ws != null)
        {
            await ws.Close();
        }
    }

    [System.Serializable]
    public class DetectionEvent
    {
        public string type;
    }
}
