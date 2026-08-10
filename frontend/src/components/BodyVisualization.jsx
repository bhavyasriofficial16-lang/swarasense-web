import { motion, AnimatePresence } from "framer-motion";
import { SWARA_CONFIG, SWARA_ORDER } from "../data/swaraConfig";

export default function BodyVisualization({ activeSwara }) {
  const active = activeSwara ? SWARA_CONFIG[activeSwara] : null;

  return (
    <div className="body-stage">
      <img src="/body.png" alt="Holographic body" className="body-image" />

      <svg viewBox="0 0 100 100" className="body-overlay" preserveAspectRatio="none">
        {SWARA_ORDER.map((key) => {
          const swara = SWARA_CONFIG[key];
          const isActive = activeSwara === key;
          const cx = swara.x * 100;
          const cy = swara.y * 100;
          return (
            <g key={key}>
              <motion.circle
                cx={cx}
                cy={cy}
                r={isActive ? 2.2 : 0.9}
                fill={swara.color}
                initial={false}
                animate={{
                  r: isActive ? [1.8, 2.6, 1.8] : 0.9,
                  opacity: isActive ? 1 : 0.45,
                }}
                transition={
                  isActive
                    ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 }
                }
                style={{
                  filter: isActive
                    ? `drop-shadow(0 0 3px ${swara.color}) drop-shadow(0 0 6px ${swara.color})`
                    : "none",
                }}
              />
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {active && (
          <motion.div
            key={activeSwara}
            className="swara-label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: active.color, top: `${active.y * 100}%` }}
          >
            {active.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
