'use client';

import { useRef, useCallback } from 'react';
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

  const handleFitToLine = () => {
    if (!field) return;
    const py = Number(field.positionY);
    const h = Number(field.height);
    const targetH = 2; // ~one line on a US Letter page
    const centerY = py + h / 2;
    const newY = Math.max(0, Math.min(centerY - targetH / 2, 100 - targetH));
    onUpdate(field.id, { height: targetH, positionY: newY });
  };

  // Read latest field via ref so the hold-to-repeat interval doesn't
  // close over a stale field object.
  const fieldRef = useRef<FieldPosition | null>(field);
  fieldRef.current = field;

  const nudgeY = useCallback((deltaPct: number) => {
    const f = fieldRef.current;
    if (!f) return;
    const py = Number(f.positionY);
    const h = Number(f.height);
    const newY = Math.max(0, Math.min(py + deltaPct, 100 - h));
    onUpdate(f.id, { positionY: newY });
  }, [onUpdate]);

  const nudgeX = useCallback((deltaPct: number) => {
    const f = fieldRef.current;
    if (!f) return;
    const px = Number(f.positionX);
    const w = Number(f.width);
    const newX = Math.max(0, Math.min(px + deltaPct, 100 - w));
    onUpdate(f.id, { positionX: newX });
  }, [onUpdate]);

  // Press-and-hold to repeatedly nudge. First click fires once, then after
  // a short delay we tick at ~12/sec so the user can scrub the field across
  // the page without spamming the button.
  const holdTimers = useRef<{ initial: ReturnType<typeof setTimeout> | null; interval: ReturnType<typeof setInterval> | null }>({
    initial: null,
    interval: null,
  });
  const startHold = (fn: () => void) => {
    fn();
    holdTimers.current.initial = setTimeout(() => {
      holdTimers.current.interval = setInterval(fn, 80);
    }, 350);
  };
  const stopHold = () => {
    if (holdTimers.current.initial) clearTimeout(holdTimers.current.initial);
    if (holdTimers.current.interval) clearInterval(holdTimers.current.interval);
    holdTimers.current = { initial: null, interval: null };
  };
  const arrowHandlers = (fn: () => void) => ({
    onMouseDown: () => startHold(fn),
    onMouseUp: stopHold,
    onMouseLeave: stopHold,
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      startHold(fn);
    },
    onTouchEnd: stopHold,
    onTouchCancel: stopHold,
  });

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

        {/* Position readout + nudge controls */}
        <div className="border-t-2 border-stone-200 pt-3 space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-stone-600">
            <span>X: {Number(field.positionX).toFixed(1)}%</span>
            <span>Y: {Number(field.positionY).toFixed(1)}%</span>
            <span>{Number(field.width).toFixed(1)}×{Number(field.height).toFixed(1)}%</span>
          </div>
          <p className="text-[9px] text-stone-500 -mt-1">Press & hold to scrub</p>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              type="button"
              {...arrowHandlers(() => nudgeY(-1))}
              className="px-2 py-3 text-lg font-bold border-2 border-black hover:bg-stone-100 select-none"
              title="Nudge up"
            >↑</button>
            <div />
            <button
              type="button"
              {...arrowHandlers(() => nudgeX(-1))}
              className="px-2 py-3 text-lg font-bold border-2 border-black hover:bg-stone-100 select-none"
              title="Nudge left"
            >←</button>
            <button
              type="button"
              onClick={handleFitToLine}
              className="px-1 text-[9px] font-bold uppercase tracking-tight border-2 border-black bg-yellow-300 hover:bg-yellow-400"
              title="Shrink height to single line, keep center"
            >
              Fit line
            </button>
            <button
              type="button"
              {...arrowHandlers(() => nudgeX(1))}
              className="px-2 py-3 text-lg font-bold border-2 border-black hover:bg-stone-100 select-none"
              title="Nudge right"
            >→</button>
            <div />
            <button
              type="button"
              {...arrowHandlers(() => nudgeY(1))}
              className="px-2 py-3 text-lg font-bold border-2 border-black hover:bg-stone-100 select-none"
              title="Nudge down"
            >↓</button>
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
