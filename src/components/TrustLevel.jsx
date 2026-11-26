import { LEVELS } from '../lib/trust.js';

// Shows the verification level as four dots plus words, so it never depends on colour alone.
export default function TrustLevel({ level }) {
  return (
    <div className="level-card">
      <div className="level-dots" role="img" aria-label={`Verification level ${level.level} of 3`}>
        {[1, 2, 3].map((n) => <span key={n} className={level.level >= n ? 'on' : ''} />)}
      </div>
      <div>
        <strong>{level.label}</strong>
        <div className="muted small">{level.description}</div>
      </div>
    </div>
  );
}

export { LEVELS };
