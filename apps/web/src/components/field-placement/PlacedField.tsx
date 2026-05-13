'use client';

import { Rnd } from 'react-rnd';
import type { FieldPosition } from '@/components/pdf/types';
import FieldTypeIcon from './FieldTypeIcon';
import { getSignerColor } from './SignerColorMap';

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
    const newY = Math.max(0, Math.min((data.y / containerHeight) * 100, 100));
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
    const newY = Math.max(0, Math.min((position.y / containerHeight) * 100, 100));
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
          'relative w-full h-full border border-dashed flex items-center justify-center',
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
        <FieldTypeIcon fieldType={field.fieldType} />

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
