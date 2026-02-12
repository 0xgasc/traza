'use client';

interface CheckboxFieldInputProps {
  fieldId: string;
  value: string;
  onFill: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function CheckboxFieldInput({
  fieldId,
  value,
  onFill,
  label,
  disabled = false,
}: CheckboxFieldInputProps) {
  const isChecked = value === 'true';

  const handleToggle = () => {
    if (disabled) return;
    onFill(isChecked ? 'false' : 'true');
  };

  if (disabled) {
    return (
      <div className="w-full h-full flex items-center gap-2 bg-stone-100/60">
        <div className="w-8 h-8 border-2 border-dashed border-stone-300 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-stone-300">?</span>
        </div>
        {label && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400 truncate">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="w-full h-full flex items-center gap-2 cursor-pointer focus:outline-none group"
      data-field-id={fieldId}
    >
      <div
        className={`w-8 h-8 shrink-0 flex items-center justify-center transition-colors ${
          isChecked
            ? 'bg-black border-[3px] border-black'
            : 'bg-stone-50 border-[3px] border-black group-hover:bg-stone-100'
        }`}
      >
        {isChecked && (
          <span className="text-white font-bold text-lg leading-none">X</span>
        )}
      </div>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-black truncate">
          {label}
        </span>
      )}
    </button>
  );
}
