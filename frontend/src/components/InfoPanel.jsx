import { motion, AnimatePresence } from "framer-motion";

export default function InfoPanel({ current, status }) {
  return (
    <div className="info-panel">
      <div className="info-panel__status">
        <span className={`status-dot status-dot--${status}`} />
        <span>{statusLabel(status)}</span>
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.timestamp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="info-panel__eyebrow">Current Swara</p>
            <h2 className="info-panel__swara" style={{ color: current.color }}>
              {current.swara}
            </h2>
            <dl className="info-grid">
              <div>
                <dt>Note</dt>
                <dd>{current.note}</dd>
              </div>
              <div>
                <dt>Frequency</dt>
                <dd>{current.frequency} Hz</dd>
              </div>
              <div>
                <dt>Body Region</dt>
                <dd className="capitalize">{current.body_part}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{Math.round(current.confidence * 100)}%</dd>
              </div>
            </dl>
          </motion.div>
        ) : (
          <motion.p className="info-panel__empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Tap "Start listening", then play a note.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function statusLabel(status) {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting to backend…";
    case "error":
      return "Backend unreachable";
    default:
      return "Idle";
  }
}
