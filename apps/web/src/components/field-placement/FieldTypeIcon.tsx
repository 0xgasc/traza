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

  // Icon-only — the label was forcing a visual minimum height and made
  // tight signature-line fits impossible. Use the properties panel for naming.
  return (
    <span
      className="inline-flex items-center justify-center text-[10px] font-bold leading-none opacity-70 select-none"
      title={config.label}
    >
      {config.icon}
    </span>
  );
}
