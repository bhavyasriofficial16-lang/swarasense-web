import { useState } from "react";

export default function ControlsPanel({
  isListening,
  onToggleListen,
  permissionState,
  onCalibrate,
  onCalibrateFromMic,
  saFrequency,
}) {
  const [freq, setFreq] = useState("");
  const [message, setMessage] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCalibrate = async () => {
    const value = parseFloat(freq);
    if (!value || value <= 0) return;
    try {
      await onCalibrate(value);
      setMessage(`Sa set to ${value.toFixed(1)} Hz`);
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("Calibration failed");
    }
  };

  const handleCaptureSa = async () => {
    if (!isListening) {
      setMessage('Tap "Start listening" first, then try again');
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setIsCapturing(true);
    setMessage("Play your Sa note now…");
    try {
      const freqHz = await onCalibrateFromMic();
      setMessage(`Sa captured: ${freqHz.toFixed(1)} Hz`);
    } catch {
      setMessage("Didn't catch a clear note — try again");
    } finally {
      setIsCapturing(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="controls-panel">
      <button
        className={`listen-button ${isListening ? "listen-button--active" : ""}`}
        onClick={onToggleListen}
      >
        {isListening ? "Stop listening" : "Start listening"}
      </button>

      {permissionState === "denied" && (
        <p className="permission-warning">
          Microphone access was denied. Enable it in your browser's site settings and reload.
        </p>
      )}

      <p className="controls-panel__label">
        Calibrate Sa{saFrequency ? ` (currently ${saFrequency} Hz)` : ""}
      </p>

      <button className="capture-button" onClick={handleCaptureSa} disabled={isCapturing}>
        {isCapturing ? "Listening…" : "🎵 Play Sa to set it"}
      </button>

      <p className="or-divider">or enter a frequency manually</p>
      <div className="calibration-row">
        <input
          type="number"
          step="0.1"
          placeholder="e.g. 261.6"
          value={freq}
          onChange={(e) => setFreq(e.target.value)}
        />
        <button onClick={handleCalibrate}>Set</button>
      </div>
      {message && <p className="controls-panel__message">{message}</p>}
    </div>
  );
}
