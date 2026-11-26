import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { listAssessments, listMyAttempts } from '../lib/api.js';
import { bestAttempts, attemptsLeftToday } from '../lib/trust.js';
import { MAX_ATTEMPTS_PER_DAY } from '../lib/constants.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';

export default function AssessmentsPage() {
  const { user, profile } = useAuth();
  const { data, error, loading, reload } = useApiData(async () => {
    const [assessments, attempts] = await Promise.all([listAssessments(), listMyAttempts(user.id)]);
    return { assessments, attempts };
  }, [user.id]);

  if (loading && !data) return <Loading label="Loading assessments" />;
  if (error) return <div className="container page"><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></div>;

  const best = bestAttempts(data.attempts);
  // Show the assessments for the person's own field first.
  const ordered = [...data.assessments].sort((a, b) => Number(b.field === profile.field) - Number(a.field === profile.field) || a.title.localeCompare(b.title));

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Skills assessments</h1>
        <p>
          Short tests that show baseline knowledge when paper records are missing. They are scored on the server and a pass is added to your public profile.
          They are not licences: they give employers something to go on.
        </p>
      </div>
      <div className="grid">
        {ordered.map((a) => {
          const b = best.get(a.id);
          const left = attemptsLeftToday(data.attempts, a.id, MAX_ATTEMPTS_PER_DAY);
          return (
            <article className="card stack-sm" key={a.id} aria-label={a.title}>
              <div className="row between">
                <span className="chip">{a.field}</span>
                {b ? (b.passed ? <span className="badge badge-success">Passed</span> : <span className="badge badge-warning">Not passed yet</span>) : <span className="badge badge-neutral">Not taken</span>}
              </div>
              <h2 style={{ fontSize: '1.15rem', marginBottom: 0 }}>{a.title}</h2>
              <p className="muted" style={{ margin: 0 }}>{a.description}</p>
              <p className="small" style={{ margin: 0 }}>
                Pass mark {a.pass_mark}%.{' '}
                {b ? `Best score ${b.best_percent}% in ${b.attempts} ${b.attempts === 1 ? 'attempt' : 'attempts'}. ` : ''}
                {left} of {MAX_ATTEMPTS_PER_DAY} attempts left today.
              </p>
              {left > 0 ? (
                <Link className="btn btn-primary btn-sm" to={`/assessments/${a.id}`}>{b ? 'Try again' : 'Start assessment'}</Link>
              ) : (
                <span className="muted small">You have used today&apos;s attempts. Come back tomorrow.</span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
