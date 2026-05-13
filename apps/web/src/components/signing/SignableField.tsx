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
  checkboxStyle?: string;
}

interface SignableFieldProps {
  field: FieldPosition;
  value: string | null;
  onFill: (fieldId: string, value: string) => void;
  disabled?: boolean;
  containerWidth: number;
  containerHeight: number;
  isFilled?: boolean;
  filledBy?: string | null;
  filledAt?: string | null;
  signerName?: string;
}

export default function SignableField({
  field,
  value,
  onFill,
  disabled = false,
  containerWidth,
  containerHeight,
  isFilled = false,
  filledBy = null,
  filledAt = null,
  signerName,
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
    const fieldType = (field.fieldType || 'text').toLowerCase();
    switch (fieldType) {
      case 'signature':
        return (
          <SignatureFieldInput
            fieldId={field.id}
            value={value}
            onFill={handleFill}
            disabled={disabled}
            signerName={signerName}
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
            boxHeight={height}
          />
        );
      case 'date':
        return (
          <DateFieldInput
            fieldId={field.id}
            value={value}
            boxHeight={height}
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
            checkboxStyle={field.checkboxStyle}
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
      className={`absolute group ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${
        isFilled ? 'ring-2 ring-green-500/50' : ''
      }`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      title={isFilled && filledBy ? `Signed by ${filledBy}` : undefined}
    >
      {disabled && !isFilled && (
        <div className="absolute -top-4 left-0 z-10">
          <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400 bg-white/80 px-1">
            {fieldTypeLabel}
          </span>
        </div>
      )}
      {isFilled && filledBy && (
        <div className="absolute -top-4 left-0 z-10 animate-in slide-in-from-left-2 duration-300">
          <span className="text-[8px] font-bold uppercase tracking-wider text-green-700 bg-green-100 border border-green-300 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
            <svg className="w-2.5 h-2.5 animate-in zoom-in duration-200 delay-150" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {filledBy}
          </span>
        </div>
      )}
      {renderInput()}
    </div>
  );
}
