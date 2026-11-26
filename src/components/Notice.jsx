// tone: error, success, info or warning. Errors are announced to screen readers straight away.
export default function Notice({ tone = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="row between">
        <div>{children}</div>
        {onClose && <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Dismiss</button>}
      </div>
    </div>
  );
}
