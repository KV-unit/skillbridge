import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container row between">
        <span>SkillBridge: a prototype built for the ILO mini-hackathon on skilled refugee inclusion (SDGs 4, 8, 10, 16, 17).</span>
        <span className="row">
          <Link to="/impact">How it works</Link>
          <Link to="/talent">Talent directory</Link>
        </span>
      </div>
    </footer>
  );
}
