import React from 'react';
import { CheckCircle2, GitBranch, Lightbulb, HelpCircle, ShieldAlert } from 'lucide-react';
import { ProvenanceType, ProvenanceBadge as ProvenanceBadgeModel } from '../types/sib';

interface ProvenanceBadgeProps {
  badge: ProvenanceBadgeModel;
  compact?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ badge, compact = false }) => {
  const { type, sourceText, confidence, sourceSystem } = badge;

  const config: Record<
    ProvenanceType,
    { label: string; icon: React.ReactNode; style: string; tooltipPrefix: string }
  > = {
    FACT: {
      label: 'FACT',
      icon: <CheckCircle2 className="w-3 h-3 text-cyan-400" />,
      style: 'text-cyan-300 bg-cyan-950/60 border-cyan-500/40',
      tooltipPrefix: 'Verified Institutional Record',
    },
    INFERENCE: {
      label: 'INFERENCE',
      icon: <GitBranch className="w-3 h-3 text-purple-400" />,
      style: 'text-purple-300 bg-purple-950/60 border-purple-500/40',
      tooltipPrefix: 'Clinically correlated by Ω-SIB — requires clinician confirmation',
    },
    SUGGESTION: {
      label: 'SUGGESTION',
      icon: <Lightbulb className="w-3 h-3 text-amber-400" />,
      style: 'text-amber-300 bg-amber-950/60 border-amber-500/40',
      tooltipPrefix: 'Clinical guideline-informed suggestion',
    },
    UNKNOWN: {
      label: 'UNKNOWN',
      icon: <HelpCircle className="w-3 h-3 text-slate-400" />,
      style: 'text-slate-300 bg-slate-800/80 border-slate-600/60',
      tooltipPrefix: 'Unrecorded / absent in institutional records',
    },
  };

  const item = config[type] || config.UNKNOWN;

  return (
    <div className="inline-flex items-center gap-1.5" title={`${item.tooltipPrefix}: ${sourceText}`}>
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider border ${item.style}`}
      >
        {item.icon}
        <span>{item.label}</span>
        {confidence && <span className="opacity-70 tabular-figures">({Math.round(confidence * 100)}%)</span>}
      </span>

      {!compact && sourceText && (
        <span className="text-[11px] text-slate-400 truncate max-w-[220px]" title={sourceText}>
          {sourceSystem ? `${sourceSystem}: ` : ''}
          {sourceText}
        </span>
      )}
    </div>
  );
};
