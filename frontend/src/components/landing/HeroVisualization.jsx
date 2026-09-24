import { BookOpen, BrainCircuit, Check, Droplets, Footprints } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

const orbitingHabits = [
  { className: 'atlas-habit-read', icon: BookOpen, label: 'Read', value: '12 min', tone: 'accent' },
  { className: 'atlas-habit-move', icon: Footprints, label: 'Move', value: 'Done', tone: 'success' },
  { className: 'atlas-habit-water', icon: Droplets, label: 'Hydrate', value: '6 / 8', tone: 'warning' },
];

export function HeroVisualization() {
  return (
    <div className="hero-visual" role="img" aria-label="Illustration of a habit routine with daily progress and AI guidance">
      <div className="atlas-backdrop" aria-hidden="true" />
      <div className="habit-atlas">
        <div className="atlas-orbit atlas-orbit-wide" aria-hidden="true" />
        <div className="atlas-orbit atlas-orbit-inner" aria-hidden="true" />
        <div className="atlas-core">
          <span className="core-kicker">TODAY</span>
          <strong>4<span>/5</span></strong>
          <span>kept promises</span>
        </div>
        {orbitingHabits.map(({ className, icon: Icon, label, value, tone }) => (
          <div key={label} className={`atlas-habit ${className}`}>
            <span className="atlas-habit-icon"><Icon size={16} aria-hidden="true" /></span>
            <span><strong>{label}</strong><small>{value}</small></span>
            {tone === 'success' && <Check size={14} aria-label="Complete" />}
          </div>
        ))}
        <div className="atlas-ai-note">
          <span className="atlas-ai-icon"><BrainCircuit size={16} aria-hidden="true" /></span>
          <span><strong>Cadence cue</strong><small>Your best window is after lunch.</small></span>
        </div>
        <Badge className="atlas-streak" tone="success">7 day rhythm</Badge>
      </div>
    </div>
  );
}
