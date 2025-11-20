import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function ChoiceButton({ choice, onSelect, disabled }) {
  const riskColors = {
    low: 'border-slate-600 hover:border-green-500 hover:bg-green-950/30',
    medium: 'border-slate-600 hover:border-yellow-500 hover:bg-yellow-950/30',
    high: 'border-slate-600 hover:border-red-500 hover:bg-red-950/30'
  };

  const riskIcons = {
    low: Info,
    medium: AlertTriangle,
    high: AlertCircle
  };

  const riskColor = choice.risk_level || 'low';
  const RiskIcon = riskIcons[riskColor];

  return (
    <Button
      onClick={() => onSelect(choice)}
      disabled={disabled}
      variant="outline"
      className={`w-full justify-start h-auto p-4 text-left transition-all duration-300 ${riskColors[riskColor]} bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur`}
    >
      <div className="flex items-start gap-3 w-full">
        <RiskIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-white font-medium mb-1">{choice.label}</div>
          {choice.description && (
            <div className="text-slate-400 text-sm">{choice.description}</div>
          )}
        </div>
      </div>
    </Button>
  );
}