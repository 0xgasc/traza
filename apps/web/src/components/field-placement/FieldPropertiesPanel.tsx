'use client';

import type { FieldPosition } from '@/components/pdf/types';

interface FieldPropertiesPanelProps {
  field: FieldPosition | null;
  onUpdate: (id: string, changes: Partial<FieldPosition>) => void;
  onClose: () => void;
}

export default function FieldPropertiesPanel({
  field,
  onUpdate,
  onClose,
}: FieldPropertiesPanelProps) {
  if (!field) return null;

  const handleCheckboxStyleChange = (style: string) => {
    onUpdate(field.id, { checkboxStyle: style });
  };

  const handleLabelChange = (label: string) => {
    onUpdate(field.id, { label: label || undefined });
  };

  const handleRequiredChange = (required: boolean) => {
    onUpdate(field.id, { required });
  };

  return (
    <div className="absolute right-4 top-4 w-64 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-30">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black px-3 py-2">
        <h3 className="font-bold uppercase text-xs tracking-wide">
          Field Properties
        </h3>
        <button
          onClick={onClose}
          className="font-bold text-lg leading-none hover:text-stone-500 transition-colors px-1"
        >
          X
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Field Type */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-600 mb-1">
            Type
          </label>
          <div className="text-sm font-semibold uppercase">
            {field.fieldType}
          </div>
        </div>

        {/* Signer */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-600 mb-1">
            Signer
          </label>
          <div className="text-xs">
            {field.signerName && (
              <div className="font-semibold">{field.signerName}</div>
            )}
            <div className="text-stone-600">{field.signerEmail}</div>
          </div>
        </div>

        {/* Label (for TEXT and CHECKBOX) */}
        {(field.fieldType === 'TEXT' || field.fieldType === 'CHECKBOX') && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-600 mb-1">
              Label
            </label>
            <input
              type="text"
              value={field.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Optional label..."
              className="w-full px-2 py-1 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        )}

        {/* Checkbox Style (only for CHECKBOX) */}
        {field.fieldType === 'CHECKBOX' && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-600 mb-1">
              Checkbox Style
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleCheckboxStyleChange('x')}
                className={`flex-1 px-3 py-2 text-sm font-bold uppercase border-2 transition-colors ${
                  field.checkboxStyle === 'x' || !field.checkboxStyle
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-stone-100'
                }`}
              >
                X
              </button>
              <button
                onClick={() => handleCheckboxStyleChange('check')}
                className={`flex-1 px-3 py-2 text-sm font-bold uppercase border-2 transition-colors ${
                  field.checkboxStyle === 'check'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-stone-100'
                }`}
              >
                ✓
              </button>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">
              Choose how the checkbox appears when checked
            </p>
          </div>
        )}

        {/* Required */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => handleRequiredChange(e.target.checked)}
              className="w-4 h-4 border-2 border-black accent-black"
            />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Required Field
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
