/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon, Plus, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

interface InputFieldProps {
  id?: string;
  label: string;
  icon?: LucideIcon;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  options?: string[]; // For select inputs
  prefix?: string; // Persistent prefix
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  className,
  error,
  options,
  prefix,
}) => {
  const handleNumberChange = (delta: number) => {
    const current = Number(value) || 0;
    onChange(String(Math.max(0, current + delta)));
  };

  return (
    <div id={id} className={cn("space-y-2", className)}>
      <label className="flex items-center space-x-2 text-sm font-medium text-white/70">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </label>
      <div className="relative flex items-center">
        {options ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all backdrop-blur-md appearance-none",
              error && "border-red-500/50 focus:ring-red-500/20"
            )}
          >
            <option value="" className="bg-[#0a0a0a]">Select {label}</option>
            {options.map((opt) => (
              <option key={opt} value={opt} className="bg-[#0a0a0a]">
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <div className="relative w-full flex items-center group">
            {prefix && (
              <span className="absolute left-4 text-white font-bold tracking-tight pointer-events-none z-10">
                {prefix}
              </span>
            )}
            <input
              type={type === 'number' ? 'text' : type} // Use text for number to avoid default spinners
              inputMode={type === 'number' ? 'numeric' : undefined}
              value={value}
              onChange={(e) => {
                let val = e.target.value;
                
                if (type === 'number') {
                  // Only allow digits
                  val = val.replace(/\D/g, '');
                }

                if (type === 'date') {
                  // Cap year at 4 digits: YYYY-MM-DD
                  const parts = val.split('-');
                  if (parts[0] && parts[0].length > 4) {
                    parts[0] = parts[0].slice(0, 4);
                    val = parts.join('-');
                  }
                }
                
                onChange(val);
              }}
              placeholder={placeholder}
              className={cn(
                "w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all backdrop-blur-md",
                prefix ? "pl-16 pr-4" : "px-4",
                type === 'number' && "pr-24", // Extra space for custom arrows
                error && "border-red-500/50 focus:ring-red-500/20"
              )}
            />
            {type === 'number' && (
              <div className="absolute right-2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleNumberChange(-1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberChange(1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500/80 animate-pulse">{error}</p>}
    </div>
  );
};
