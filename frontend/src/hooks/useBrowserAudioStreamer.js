import { useCallback, useRef, useState } from "react";

// 4096-sample buffer at the browser's native sample rate (commonly 44100 or
// 48000Hz) gives ~85-100ms chunks -- small enough for responsive detection,
// large enough for the autocorrelation pitch detector to work with reliably.
const BUFFER_SIZE = 4096;

export function useBrowserAudioStreamer(onChunk) {
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState(null); // null | "granted" | "denied"
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // these are speech-call features that can
          noiseSuppression: false, // distort musical harmonics -- same
          autoGainControl: false, // lesson learned from the mobile app's
          // audioSource bug (VOICE_RECOGNITION vs plain MIC)
        },
      });
      streamRef.current = stream;
      setPermissionState("granted");

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const sampleRate = audioContext.sampleRate;

      const source = audioContext.createMediaStreamSource(stream);
      // ScriptProcessorNode is deprecated in favor of AudioWorklet, but
      // remains universally supported (including iOS Safari) with far less
      // setup complexity -- appropriate here given the need for broad
      // browser/device compatibility over cutting-edge API usage.
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const floatData = event.inputBuffer.getChannelData(0);
        const base64Chunk = floatPcmToBase64Int16(floatData);
        onChunkRef.current?.(base64Chunk, sampleRate);
      };

      source.connect(processor);
      // Some browsers require the processor connected to the destination
      // to actually fire onaudioprocess, even though we discard the output.
      processor.connect(audioContext.destination);

      setIsListening(true);
    } catch (err) {
      console.warn("Microphone access failed:", err);
      setPermissionState("denied");
    }
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    setIsListening(false);
  }, []);

  return { isListening, permissionState, start, stop };
}

function floatPcmToBase64Int16(floatData) {
  const int16Data = new Int16Array(floatData.length);
  for (let i = 0; i < floatData.length; i++) {
    const clamped = Math.max(-1, Math.min(1, floatData[i]));
    int16Data[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16Data.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
