'use client';

import SignatureFieldInput from './SignatureFieldInput';
import InitialsFieldInput from './InitialsFieldInput';
import TextFieldInput from './TextFieldInput';
import DateFieldInput from './DateFieldInput';
import CheckboxFieldInput from './CheckboxFieldInput';

interface FieldPosition {
  id: string;
  fieldType: string;
  label?: string;
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  required?: boolean;
  signerEmail?: string;
}

interface SignableFieldProps {
  field: FieldPosition;
  value: string | null;
  onFill: (fieldId: string, value: string) => void;
  disabled?: boolean;
  containerWidth: number;
  containerHeight: number;
}

export default function SignableField({
  field,
  value,
  onFill,
  disabled = false,
  containerWidth,
  containerHeight,
}: SignableFieldProps) {
  const left = (field.xPercent / 100) * containerWidth;
  const top = (field.yPercent / 100) * containerHeight;
  const width = (field.widthPercent / 100) * containerWidth;
  const height = (field.heightPercent / 100) * containerHeight;

  const handleFill = (val: string) => {
    onFill(field.id, val);
  };

  const fieldTypeLabel = (field.fieldType || 'text').toUpperCase();

  const renderInput = () => {
    switch (field.fieldType) {
      case 'signature':
        return (
          <SignatureFieldInput
            fieldId={field.id}
            value={value}
            onFill={handleFill}
            disabled={disabled}
          />
        );
      case 'initials':
        return (
          <InitialsFieldInput
            fieldId={field.id}
            value={value}
            onFill={handleFill}
            disabled={disabled}
          />
        );
      case 'text':
        return (
          <TextFieldInput
            fieldId={field.id}
            value={value}
            onFill={handleFill}
            label={field.label}
            disabled={disabled}
          />
        );
      case 'date':
        return (
          <DateFieldInput
            fieldId={field.id}
            value={value}
            onFill={handleFill}
            disabled={disabled}
          />
        );
      case 'checkbox':
        return (
          <CheckboxFieldInput
            fieldId={field.id}
            value={value || ''}
            onFill={handleFill}
            label={field.label}
            disabled={disabled}
          />
        );
      default:
        return (
          <TextFieldInput
            fieldId={field.id}
            value={value}
            onFill={handleFill}
            label={field.label || field.fieldType}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div
      className={`absolute ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {disabled && (
        <div className="absolute -top-4 left-0 z-10">
          <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400 bg-white/80 px-1">
            {fieldTypeLabel}
          </span>
        </div>
      )}
      {renderInput()}
    </div>
  );
}
