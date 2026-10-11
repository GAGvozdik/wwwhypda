import { Link } from 'react-router-dom';

export default function LegalLinks({ className }: { className?: string }) {
    return <nav aria-label="Legal documents" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem' }}>
        <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className={className}>Privacy Policy</Link>
        <Link to="/cookie-policy" target="_blank" rel="noopener noreferrer" className={className}>Cookie Policy</Link>
        <Link to="/user-agreement" target="_blank" rel="noopener noreferrer" className={className}>User Agreement</Link>
    </nav>;
}
