import Logo from './Logo.jsx';

export default function SetupNeeded() {
  return (
    <div className="container">
      <div className="card setup stack">
        <div className="brand"><Logo /> SkillBridge</div>
        <h1>Almost there: connect Supabase</h1>
        <p>This copy of the app has no database connection yet. Add two values and restart:</p>
        <p>
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
        </p>
        <p className="muted">
          Locally, put them in <code>.env.local</code>. On Vercel, add them under Project Settings, Environment Variables, then
          redeploy. DEPLOYMENT.md has the exact steps.
        </p>
      </div>
    </div>
  );
}
