import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container page">
      <div className="card center stack">
        <h1>Page not found</h1>
        <p className="muted">That page does not exist. It may have moved.</p>
        <div><Link className="btn btn-primary" to="/">Back to the home page</Link></div>
      </div>
    </div>
  );
}
