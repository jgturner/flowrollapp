import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
import React from 'react';

const RULES_SET_OPTIONS = [
  { value: 'IBJJF', label: 'IBJJF' },
  { value: 'ADCC', label: 'ADCC' },
  { value: 'EBI', label: 'EBI' },
  { value: 'WNO', label: 'WNO/FloGrappling' },
  { value: 'F2W', label: 'F2W' },
  { value: 'BJJFANATICS', label: 'BJJ Fanatics/Local Tournaments' },
];

interface RulesSetSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
  placeholder?: string;
}

export function RulesSetSelect({ value, onChange, className, label, placeholder }: RulesSetSelectProps) {
  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || 'Select rules set'} />
        </SelectTrigger>
        <SelectContent>
          {RULES_SET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
