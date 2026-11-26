import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApiData } from '../lib/useApiData.js';
import { getAssessmentForTaking, submitAssessment } from '../lib/api.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';

export default function AssessmentTakePage() {
  const { id } = useParams();
  const { data: quiz, error, loading } = useApiData(() => getAssessmentForTaking(id), [id]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading label="Loading the assessment" />;
  if (error) {
    return (
      <div className="container page">
        <Notice tone="error">{error}</Notice>
        <Link to="/assessments" className="btn btn-secondary">Back to assessments</Link>
      </div>
    );
  }

  const total = quiz.questions.length;
  const answered = Object.keys(answers).length;

  const submit = async (e) => {
    e.preventDefault();
    setFailure('');
    setBusy(true);
    try {
      setResult(await submitAssessment(id, answers));
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="container page" style={{ maxWidth: 640 }}>
        <section className="card center stack" aria-live="polite">
          <h1>{result.passed ? 'You passed' : 'Not passed this time'}</h1>
          <div className={`score ${result.passed ? 'pass' : 'fail'}`}>{result.percent}%</div>
          <p>
            You answered {result.score} of {result.total} correctly. The pass mark is {result.pass_mark}%.{' '}
            {result.passed ? 'This is now part of your profile.' : 'Review the topic and try again. Only your total score is shown.'}
          </p>
          <p className="muted small">{result.attempts_left} of 5 attempts left today for this assessment.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/assessments">Back to assessments</Link>
            <Link className="btn btn-secondary" to="/dashboard">Go to dashboard</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1>{quiz.title}</h1>
        <p>{quiz.description} Choose one answer for each question. You need {quiz.pass_mark}% to pass.</p>
      </div>
      <form className="stack" onSubmit={submit}>
        <Notice tone="error">{failure}</Notice>
        {quiz.questions.map((q, index) => (
          <fieldset className="question" key={q.id}>
            <legend>{index + 1}. {q.prompt}</legend>
            {q.options.map((option, i) => (
              <label key={i} className={`option${answers[q.id] === i ? ' selected' : ''}`}>
                <input type="radio" name={`q-${q.id}`} value={i} checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <div className="row between">
          <span className="muted" aria-live="polite">{answered} of {total} answered</span>
          <button className="btn btn-primary" type="submit" disabled={busy || answered < total}>{busy ? 'Scoring...' : 'Submit answers'}</button>
        </div>
      </form>
    </div>
  );
}
