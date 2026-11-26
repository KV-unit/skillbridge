import { useId } from 'react';

// A label, an input and an error message wired together for screen readers.
// `as` can be 'input' (default), 'textarea' or 'select' (pass options as children).
export default function Field({ label, error, hint, as = 'input', children, ...props }) {
  const id = useId();
  const Tag = as;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </Tag>
      {hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}
