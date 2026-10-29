export default function TopicChips({
  items,
  onSelect,
  activeItems = [],
  variant = "",
}) {
  const isSelected = (item) => {
    if (Array.isArray(activeItems)) {
      return activeItems.includes(item);
    }
    return activeItems === item;
  };

  const getClassName = (item) => {
    const base = variant === "sm" ? "topic-pill-sm" : "topic-pill";
    const active = isSelected(item) ? " active" : "";
    const extra = variant && variant !== "sm" ? ` ${variant}` : "";
    return `${base}${active}${extra}`;
  };

  return (
    <div className="chips-row">
      {items.map((t) =>
        onSelect ? (
          <button
            key={t}
            type="button"
            className={getClassName(t)}
            onClick={() => onSelect(t)}
          >
            {t}
          </button>
        ) : (
          <span key={t} className={getClassName(t)}>
            {t}
          </span>
        )
      )}
    </div>
  );
}
