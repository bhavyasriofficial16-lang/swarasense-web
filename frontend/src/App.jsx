import { useCallback } from "react";
import { useSwaraSocket } from "./hooks/useSwaraSocket";
import { useBrowserAudioStreamer } from "./hooks/useBrowserAudioStreamer";
import BodyVisualization from "./components/BodyVisualization";
import InfoPanel from "./components/InfoPanel";
import NoteHistory from "./components/NoteHistory";
import ControlsPanel from "./components/ControlsPanel";

export default function App() {
  const { current, history, status, sendAudioChunk, calibrateSa, calibrateSaFromMic, saFrequency } =
    useSwaraSocket();

  const handleChunk = useCallback(
    (base64Chunk, sampleRate) => {
      sendAudioChunk(base64Chunk, sampleRate);
    },
    [sendAudioChunk]
  );

  const { isListening, permissionState, start, stop } = useBrowserAudioStreamer(handleChunk);

  const toggleListen = () => {
    if (isListening) stop();
    else start();
  };

  return (
    <div className="app">
      <header className="app__header">
        <p className="app__eyebrow">Swara &middot; Sharira</p>
        <h1 className="app__title">SwaraSense</h1>
        <p className="app__subtitle">Play a note. Watch where it lives in the body.</p>
      </header>

      <main className="app__stage">
        <BodyVisualization activeSwara={current?.swara} />

        <aside className="app__sidebar">
          <InfoPanel current={current} status={status} />
          <NoteHistory history={history} />
          <ControlsPanel
            isListening={isListening}
            onToggleListen={toggleListen}
            permissionState={permissionState}
            onCalibrate={calibrateSa}
            onCalibrateFromMic={calibrateSaFromMic}
            saFrequency={saFrequency}
          />
        </aside>
      </main>

      <footer className="app__footer">
        <span>Sa · Re · Ga · Ma · Pa · Dha · Ni</span>
      </footer>
    </div>
  );
}
