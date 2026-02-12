'use client';

interface FieldTypeIconProps {
  fieldType: 'SIGNATURE' | 'DATE' | 'TEXT' | 'INITIALS' | 'CHECKBOX';
}

const FIELD_ICONS: Record<string, { icon: string; label: string }> = {
  SIGNATURE: { icon: '\u270D', label: 'Signature' },
  DATE: { icon: '\uD83D\uDCC5', label: 'Date' },
  TEXT: { icon: 'T', label: 'Text' },
  INITIALS: { icon: 'I', label: 'Initials' },
  CHECKBOX: { icon: '\u2611', label: 'Checkbox' },
};

export default function FieldTypeIcon({ fieldType }: FieldTypeIconProps) {
  const config = FIELD_ICONS[fieldType] || { icon: '?', label: fieldType };

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
      <span className="text-sm">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
