export default function NoteHistory({ history }) {
  if (!history.length) return null;
  return (
    <div className="note-history">
      <p className="note-history__label">Recent</p>
      <div className="note-history__row">
        {history.map((item, i) => (
          <span
            key={item.timestamp ?? i}
            className="note-history__chip"
            style={{ borderColor: item.color, color: item.color }}
          >
            {item.swara}
          </span>
        ))}
      </div>
    </div>
  );
}
