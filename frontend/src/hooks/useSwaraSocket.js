import { useEffect, useRef, useState, useCallback } from "react";

// Points at /ws/mobile-audio (client-pushed audio), NOT /ws/audio --
// /ws/audio has the SERVER capture its own machine's mic via sounddevice,
// which only works for local dev. Once deployed, the backend runs on a
// cloud server with no mic attached, so the BROWSER captures audio and
// pushes it up instead.
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/mobile-audio";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const MAX_HISTORY = 12;
const RECONNECT_DELAY_MS = 2000;

export function useSwaraSocket() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("idle");
  const [saFrequency, setSaFrequency] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimer = useRef(null);
  const calibrateArmedRef = useRef(false);
  const calibrateResolveRef = useRef(null);

  const connect = useCallback(() => {
    setStatus("connecting");
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setStatus("connected");
    socket.onerror = () => setStatus("error");

    socket.onclose = () => {
      setStatus("idle");
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "calibration_result") {
          setSaFrequency(data.sa_frequency);
          calibrateResolveRef.current?.(data.sa_frequency);
          calibrateResolveRef.current = null;
          return;
        }

        setCurrent(data);
        setHistory((prev) => [data, ...prev].slice(0, MAX_HISTORY));
      } catch (err) {
        console.error("Malformed message from backend:", err);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [connect]);

  const sendAudioChunk = useCallback((base64Pcm, sampleRate) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      const calibrate = calibrateArmedRef.current;
      if (calibrate) calibrateArmedRef.current = false;
      socket.send(JSON.stringify({ audio: base64Pcm, sampleRate, calibrate }));
    }
  }, []);

  const calibrateSaFromMic = useCallback(() => {
    return new Promise((resolve) => {
      calibrateResolveRef.current = resolve;
      calibrateArmedRef.current = true;
    });
  }, []);

  const calibrateSa = useCallback(async (frequency) => {
    const res = await fetch(`${API_URL}/calibrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency }),
    });
    if (!res.ok) throw new Error("Calibration failed");
    const data = await res.json();
    setSaFrequency(data.sa_frequency);
    return data;
  }, []);

  return {
    current,
    history,
    status,
    sendAudioChunk,
    calibrateSa,
    calibrateSaFromMic,
    saFrequency,
  };
}
