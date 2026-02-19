'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PdfViewer from '@/components/pdf/PdfViewer';
import FieldToolbar from './FieldToolbar';
import PlacedField from './PlacedField';
import { useFieldPlacement } from './useFieldPlacement';
import type { FieldPosition } from '@/components/pdf/types';

export interface FieldPlacerHandle {
  save: () => Promise<void>;
  isDirty: boolean;
  saving: boolean;
}

interface FieldPlacerProps {
  documentId: string;
  pdfUrl: string;
  signers: Array<{ email: string; name: string }>;
  authToken?: string;
  fieldsEndpoint?: string;
  onReady?: (handle: FieldPlacerHandle) => void;
}

export default function FieldPlacer({
  documentId,
  pdfUrl,
  signers,
  authToken,
  fieldsEndpoint,
  onReady,
}: FieldPlacerProps) {
  const {
    fields,
    addField,
    updateField,
    removeField,
    save,
    loading,
    saving,
    isDirty,
    loadFields,
  } = useFieldPlacement(documentId, fieldsEndpoint);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedSignerIndex, setSelectedSignerIndex] = useState(0);
  const [_currentPage, setCurrentPage] = useState(1);
  const [scale] = useState(1.0);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const onReadyCalled = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadFields();
    }
  }, [loadFields]);

  // Call onReady callback when component is ready
  useEffect(() => {
    if (onReady && !onReadyCalled.current && !loading) {
      onReadyCalled.current = true;
      onReady({ save, isDirty, saving });
    }
  }, [onReady, loading, save, isDirty, saving]);

  // Update handle when save state changes
  useEffect(() => {
    if (onReady && onReadyCalled.current) {
      onReady({ save, isDirty, saving });
    }
  }, [onReady, save, isDirty, saving]);

  // Escape key clears the active tool
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTool(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Toolbar button clicked: toggle the active tool (click again to deselect)
  const handleSelectTool = useCallback((fieldType: string) => {
    setActiveTool((prev) => (prev === fieldType ? null : fieldType));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await save();
    } catch {
      alert('Failed to save fields. Please try again.');
    }
  }, [save]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const renderOverlayWithDimensions = useCallback(
    (pageNumber: number) => {
      const pageFields = fields.filter((f) => f.page === pageNumber);

      return (
        <PageOverlay
          pageNumber={pageNumber}
          pageFields={pageFields}
          signers={signers}
          scale={scale}
          selectedFieldId={selectedFieldId}
          selectedSignerIndex={selectedSignerIndex}
          activeTool={activeTool}
          onUpdate={updateField}
          onDelete={removeField}
          onSelect={setSelectedFieldId}
          onAddField={addField}
        />
      );
    },
    [
      fields,
      signers,
      scale,
      selectedFieldId,
      selectedSignerIndex,
      activeTool,
      updateField,
      removeField,
      addField,
    ]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
          <p className="font-bold uppercase text-sm tracking-wide text-stone-700">
            Loading Fields...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border-4 border-black">
      <FieldToolbar
        signers={signers}
        selectedSignerIndex={selectedSignerIndex}
        onSelectSigner={setSelectedSignerIndex}
        onSelectTool={handleSelectTool}
        activeTool={activeTool}
        onSave={handleSave}
        saving={saving}
        isDirty={isDirty}
      />
      <div className="flex-1 overflow-hidden">
        <PdfViewer
          pdfUrl={pdfUrl}
          scale={scale}
          onPageChange={handlePageChange}
          renderOverlay={renderOverlayWithDimensions}
          className="h-full"
          authToken={authToken}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Inner component that self-measures to get real pixel dimensions
// ------------------------------------------------------------------

interface PageOverlayProps {
  pageNumber: number;
  pageFields: FieldPosition[];
  signers: Array<{ email: string; name: string }>;
  scale: number;
  selectedFieldId: string | null;
  selectedSignerIndex: number;
  activeTool: string | null;
  onUpdate: (id: string, changes: Partial<FieldPosition>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onAddField: (fieldType: string, page: number, signerEmail: string, signerName?: string, posX?: number, posY?: number) => void;
}

function PageOverlay({
  pageNumber,
  pageFields,
  signers,
  scale,
  selectedFieldId,
  selectedSignerIndex,
  activeTool,
  onUpdate,
  onDelete,
  onSelect,
  onAddField,
}: PageOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    const measure = () => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target !== e.currentTarget) return;
    if (!activeTool || signers.length === 0) return;

    // Convert click coordinates to percentages relative to the overlay
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    // Center a 20×5% field on the click point, clamped to bounds
    const posX = Math.max(0, Math.min(rawX - 10, 80));
    const posY = Math.max(0, Math.min(rawY - 2.5, 95));

    const signer = signers[selectedSignerIndex];
    onAddField(activeTool, pageNumber, signer.email, signer.name, posX, posY);

    // Keep tool active so user can place multiple fields of the same type
    // Press Escape or click the toolbar button again to deactivate
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      onClick={handleClick}
      style={{ cursor: activeTool && signers.length > 0 ? 'crosshair' : 'default' }}
    >
      {dims.w > 0 &&
        pageFields.map((field) => {
          const signerIdx = signers.findIndex(
            (s) => s.email === field.signerEmail
          );
          return (
            <PlacedField
              key={field.id}
              field={field}
              signerIndex={signerIdx >= 0 ? signerIdx : 0}
              scale={scale}
              containerWidth={dims.w}
              containerHeight={dims.h}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isSelected={selectedFieldId === field.id}
              onSelect={onSelect}
            />
          );
        })}
    </div>
  );
}
