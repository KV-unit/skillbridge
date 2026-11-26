import { CREDENTIAL_STATUS, WAIVER_STATUS } from '../lib/constants.js';

export default function StatusBadge({ status, kind = 'credential' }) {
  const table = kind === 'waiver' ? WAIVER_STATUS : CREDENTIAL_STATUS;
  const entry = table[status] || { label: status, tone: 'neutral' };
  return <span className={`badge badge-${entry.tone}`}>{entry.label}</span>;
}
