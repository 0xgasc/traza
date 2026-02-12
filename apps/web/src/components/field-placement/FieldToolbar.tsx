'use client';

import { getSignerColor } from './SignerColorMap';
import FieldTypeIcon from './FieldTypeIcon';

const FIELD_TYPES = [
  'SIGNATURE',
  'DATE',
  'TEXT',
  'INITIALS',
  'CHECKBOX',
] as const;

interface FieldToolbarProps {
  signers: Array<{ email: string; name: string }>;
  selectedSignerIndex: number;
  onSelectSigner: (index: number) => void;
  onAddField: (fieldType: string) => void;
  onSave: () => void;
  saving: boolean;
  isDirty: boolean;
}

export default function FieldToolbar({
  signers,
  selectedSignerIndex,
  onSelectSigner,
  onAddField,
  onSave,
  saving,
  isDirty,
}: FieldToolbarProps) {
  return (
    <div className="w-64 flex-shrink-0 bg-stone-50 border-r-4 border-black flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-black text-white">
        <h2 className="text-sm font-bold uppercase tracking-widest">
          Field Toolbar
        </h2>
      </div>

      {/* Signer Selector */}
      <div className="p-4 border-b-4 border-black">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">
          Select Signer
        </h3>
        <div className="flex flex-col gap-2">
          {signers.map((signer, index) => {
            const color = getSignerColor(index);
            const isActive = index === selectedSignerIndex;
            return (
              <button
                key={signer.email}
                onClick={() => onSelectSigner(index)}
                className={[
                  'w-full text-left px-3 py-2 border-2 font-bold text-xs uppercase tracking-wide transition-all',
                  color.border,
                  isActive ? `${color.bg} ${color.text} ring-2 ${color.ring}` : 'bg-white text-stone-700 hover:bg-stone-100',
                ].join(' ')}
              >
                <div className="truncate">{signer.name || signer.email}</div>
                <div className="font-mono text-[10px] truncate opacity-70 normal-case">
                  {signer.email}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Field Types */}
      <div className="p-4 border-b-4 border-black flex-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">
          Add Field
        </h3>
        {signers.length === 0 ? (
          <p className="text-xs text-stone-400 font-semibold uppercase">
            Add signers first
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft}
                onClick={() => onAddField(ft)}
                className="w-full text-left px-3 py-2 border-2 border-black bg-white font-bold text-xs uppercase tracking-wide hover:bg-stone-900 hover:text-white transition-colors"
              >
                <FieldTypeIcon fieldType={ft} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-4 border-t-4 border-black">
        <button
          onClick={onSave}
          disabled={saving || !isDirty}
          className={[
            'w-full px-4 py-3 border-4 border-black font-bold text-sm uppercase tracking-widest transition-all',
            'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'active:shadow-none active:translate-x-1 active:translate-y-1',
            isDirty && !saving
              ? 'bg-black text-white hover:bg-stone-800'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none',
          ].join(' ')}
        >
          {saving ? 'Saving...' : isDirty ? 'Save Fields' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
