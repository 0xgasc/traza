'use client';

import { Rnd } from 'react-rnd';
import type { FieldPosition } from '@/components/pdf/types';
import type { SnapLine } from '@/components/pdf/PdfViewer';
import { getSignerColor } from './SignerColorMap';

const FIELD_GLYPHS: Record<string, string> = {
  SIGNATURE: '✍',
  INITIALS: 'I',
  TEXT: 'T',
  DATE: '📅',
  CHECKBOX: '☑',
};

function todayShort(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Show roughly what the field will look like once filled — using the signer's
// name for signature/initials previews, today's date for date, and the field
// label (or "Sample text") for text. Sized to the box height so the user
// can sanity-check fit before sending.
function PreviewContent({
  field,
  boxHeightPx,
}: {
  field: FieldPosition;
  boxHeightPx: number;
}) {
  const fontPx = Math.max(7, Math.min(boxHeightPx * 0.55, 12));
  const fontStyle: React.CSSProperties = { fontSize: `${fontPx}px`, lineHeight: 1 };
  const ft = field.fieldType.toUpperCase();

  if (ft === 'SIGNATURE' || ft === 'INITIALS') {
    const name = field.signerName || 'Signature';
    const display = ft === 'INITIALS'
      ? name.split(/\s+/).map((p) => p[0]).slice(0, 3).join('').toUpperCase() || 'AB'
      : name;
    return (
      <span
        className="italic font-semibold text-stone-800 truncate select-none px-1"
        style={fontStyle}
        title={`Preview: ${display}`}
      >
        {display}
      </span>
    );
  }

  if (ft === 'DATE') {
    return (
      <span
        className="font-mono text-stone-800 whitespace-nowrap select-none px-1"
        style={fontStyle}
      >
        {todayShort()}
      </span>
    );
  }

  if (ft === 'CHECKBOX') {
    return (
      <span className="text-stone-600 select-none" style={fontStyle}>
        {FIELD_GLYPHS.CHECKBOX}
      </span>
    );
  }

  // TEXT and any unknown type
  return (
    <span
      className="font-mono text-stone-600 truncate select-none px-1"
      style={fontStyle}
    >
      {field.label || 'Sample text'}
    </span>
  );
}

// Snap when the field's bottom edge is within this many percentage points
// of a detected underline. ~1.5% of US Letter ≈ 12px, generous enough to
// feel magnetic without grabbing the wrong line.
const SNAP_THRESHOLD_PCT = 1.5;

interface PlacedFieldProps {
  field: FieldPosition;
  signerIndex: number;
  scale: number;
  containerWidth: number;
  containerHeight: number;
  onUpdate: (id: string, changes: Partial<FieldPosition>) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  snapLines?: SnapLine[];
}

// Snap the field's BOTTOM to the nearest detected underline. Signatures and
// printed text both sit *above* a signature line, so aligning the bottom is
// the right anchor.
function snapBottomY(
  topYPct: number,
  heightPct: number,
  lines: SnapLine[],
): number {
  const bottom = topYPct + heightPct;
  let best: { line: SnapLine; dist: number } | null = null;
  for (const l of lines) {
    const dist = Math.abs(l.yPercent - bottom);
    if (dist <= SNAP_THRESHOLD_PCT && (best === null || dist < best.dist)) {
      best = { line: l, dist };
    }
  }
  if (!best) return topYPct;
  return Math.max(0, Math.min(best.line.yPercent - heightPct, 100 - heightPct));
}

export default function PlacedField({
  field,
  signerIndex,
  scale,
  containerWidth,
  containerHeight,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  snapLines = [],
}: PlacedFieldProps) {
  const color = getSignerColor(signerIndex);

  // Convert percentage coordinates to pixel values
  const x = (field.positionX / 100) * containerWidth;
  const y = (field.positionY / 100) * containerHeight;
  const w = (field.width / 100) * containerWidth;
  const h = (field.height / 100) * containerHeight;

  const handleDragStop = (
    _e: unknown,
    data: { x: number; y: number }
  ) => {
    const newX = Math.max(0, Math.min((data.x / containerWidth) * 100, 100));
    const rawY = Math.max(0, Math.min((data.y / containerHeight) * 100, 100));
    const heightPct = Number(field.height);
    const newY = snapBottomY(rawY, heightPct, snapLines);
    onUpdate(field.id, { positionX: newX, positionY: newY });
  };

  const handleResizeStop = (
    _e: unknown,
    _direction: unknown,
    ref: HTMLElement,
    _delta: unknown,
    position: { x: number; y: number }
  ) => {
    const newWidth = (parseFloat(ref.style.width) / containerWidth) * 100;
    const newHeight = (parseFloat(ref.style.height) / containerHeight) * 100;
    const newX = Math.max(0, Math.min((position.x / containerWidth) * 100, 100));
    const rawY = Math.max(0, Math.min((position.y / containerHeight) * 100, 100));
    const newY = snapBottomY(rawY, newHeight, snapLines);
    onUpdate(field.id, {
      positionX: newX,
      positionY: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  return (
    <Rnd
      position={{ x, y }}
      size={{ width: w, height: h }}
      scale={scale}
      minWidth={12}
      minHeight={6}
      bounds="parent"
      onDragStart={() => onSelect(field.id)}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      className={`group cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
    >
      <div
        className={[
          'relative w-full h-full border border-dashed flex items-center justify-center overflow-hidden',
          color.bg,
          color.border,
          color.text,
          isSelected ? `ring-2 ${color.ring}` : '',
        ].join(' ')}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(field.id);
        }}
      >
        <PreviewContent
          field={field}
          boxHeightPx={h}
        />

        {/* Delete button — floats outside top-right so it doesn't eat field space */}
        <button
          className={[
            'absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center',
            'bg-black text-white text-[10px] font-bold leading-none rounded-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-red-600 z-10',
          ].join(' ')}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          title="Remove field"
        >
          ×
        </button>
      </div>
    </Rnd>
  );
}
