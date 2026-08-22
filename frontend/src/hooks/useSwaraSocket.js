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

// If the socket reports "open" but hasn't delivered anything in this long,
// treat it as stale and force a reconnect. This is what actually fixes the
// "swara freezes but everything looks otherwise fine" symptom -- a
// WebSocket can silently stop delivering data (free-tier hosting proxy
// idle timeouts, a flaky mobile network swapping towers, etc.) without
// ever firing onclose/onerror, so relying on those alone isn't enough for
// a long-running session.
const STALE_TIMEOUT_MS = 10000;
const STALE_CHECK_INTERVAL_MS = 3000;

// If the browser can't push data to the server fast enough, `bufferedAmount`
// grows. Skipping sends while it's backed up prevents that queue from
// growing unbounded over a long session, which would otherwise eventually
// degrade or stall the connection.
const MAX_BUFFERED_BYTES = 256 * 1024;

export function useSwaraSocket() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("idle");
  const [saFrequency, setSaFrequency] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimer = useRef(null);
  const staleCheckTimer = useRef(null);
  const lastMessageAtRef = useRef(Date.now());
  const calibrateArmedRef = useRef(false);
  const calibrateResolveRef = useRef(null);

  const connect = useCallback(() => {
    setStatus("connecting");
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    lastMessageAtRef.current = Date.now();

    socket.onopen = () => {
      setStatus("connected");
      lastMessageAtRef.current = Date.now();
    };

    socket.onerror = () => setStatus("error");

    socket.onclose = () => {
      setStatus("idle");
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onmessage = (event) => {
      lastMessageAtRef.current = Date.now();
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

    // Periodically check whether the socket has gone quiet despite still
    // reporting itself "open" -- if so, force-close it (triggering onclose
    // -> the existing auto-reconnect logic) rather than waiting indefinitely.
    staleCheckTimer.current = setInterval(() => {
      const socket = socketRef.current;
      if (
        socket &&
        socket.readyState === WebSocket.OPEN &&
        Date.now() - lastMessageAtRef.current > STALE_TIMEOUT_MS
      ) {
        console.warn("WebSocket appears stale (no data in a while) -- reconnecting.");
        socket.close();
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(reconnectTimer.current);
      clearInterval(staleCheckTimer.current);
      socketRef.current?.close();
    };
  }, [connect]);

  const sendAudioChunk = useCallback((base64Pcm, sampleRate) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) return; // let it catch up

    const calibrate = calibrateArmedRef.current;
    if (calibrate) calibrateArmedRef.current = false;
    socket.send(JSON.stringify({ audio: base64Pcm, sampleRate, calibrate }));
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