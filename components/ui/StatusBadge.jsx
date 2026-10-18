export default function StatusBadge({ code, label, className = '' }) {
  return (
    <span className={`badge badge-${code} ${className}`}>
      <i aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
