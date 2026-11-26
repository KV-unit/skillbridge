import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

function NavItem({ to, children, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to + '/'));
  return (
    <Link to={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={onClick}>
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, isReviewer, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const logout = async () => {
    close();
    try { await signOut(); } finally { navigate('/'); }
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <Logo /> SkillBridge
        </Link>
        <button type="button" className="btn btn-secondary btn-sm nav-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="site-nav" className={`nav-links${open ? ' open' : ''}`} aria-label="Main">
          <NavItem to="/talent" onClick={close}>Talent</NavItem>
          <NavItem to="/bridging" onClick={close}>Bridging</NavItem>
          {!user && <NavItem to="/impact" onClick={close}>How it works</NavItem>}
          {user && (
            <>
              <NavItem to="/dashboard" onClick={close}>Dashboard</NavItem>
              <NavItem to="/credentials" onClick={close}>My claims</NavItem>
              <NavItem to="/assessments" onClick={close}>Assessments</NavItem>
              {isReviewer && <NavItem to="/review" onClick={close}>Review queue</NavItem>}
            </>
          )}
          <span className="nav-spacer" />
          {user ? (
            <>
              <NavItem to="/profile" onClick={close}>Profile</NavItem>
              <button type="button" className="link-button" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <NavItem to="/login" onClick={close}>Log in</NavItem>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Create profile</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
