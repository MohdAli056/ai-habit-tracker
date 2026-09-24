import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BrandMark({ className = '' }) {
  return (
    <Link className={`brand-mark ${className}`} to="/" aria-label="Cadence home">
      <span className="brand-glyph"><Sparkles size={16} aria-hidden="true" /></span>
      <span>cadence</span>
    </Link>
  );
}
