'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import type { FieldPosition } from '@/components/pdf/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('traza_access_token');
}

/** PUT request using fetch directly (api.ts does not export apiPut) */
async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function generateId(): string {
  return 'field_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

interface UseFieldPlacementReturn {
  fields: FieldPosition[];
  addField: (fieldType: string, page: number, signerEmail: string, signerName?: string, posX?: number, posY?: number) => void;
  updateField: (id: string, changes: Partial<FieldPosition>) => void;
  removeField: (id: string) => void;
  save: () => Promise<void>;
  loading: boolean;
  saving: boolean;
  isDirty: boolean;
  loadFields: () => Promise<void>;
  lastSavedAt: Date | null;
}

export function useFieldPlacement(documentId: string, fieldsEndpoint?: string): UseFieldPlacementReturn {
  const [fields, setFields] = useState<FieldPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const orderCounter = useRef(0);

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<FieldPosition[]>(
        `${fieldsEndpoint ?? `/api/v1/documents/${documentId}/fields`}`
      );
      const mapped: FieldPosition[] = (data || []).map((f: FieldPosition) => ({
        id: f.id,
        fieldType: f.fieldType,
        page: f.page,
        positionX: f.positionX,
        positionY: f.positionY,
        width: f.width,
        height: f.height,
        signerEmail: f.signerEmail,
        signerName: f.signerName,
        required: f.required ?? true,
        label: f.label,
        order: f.order ?? 0,
      }));
      setFields(mapped);
      orderCounter.current = mapped.length;
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load fields:', err);
    } finally {
      setLoading(false);
    }
  }, [documentId, fieldsEndpoint]);

  const addField = useCallback(
    (fieldType: string, page: number, signerEmail: string, signerName?: string, posX?: number, posY?: number) => {
      const newField: FieldPosition = {
        id: generateId(),
        fieldType: fieldType as FieldPosition['fieldType'],
        page,
        positionX: posX ?? 35,
        positionY: posY ?? 40,
        width: 20,
        height: 5,
        signerEmail,
        signerName,
        required: true,
        order: orderCounter.current++,
      };
      setFields((prev) => [...prev, newField]);
      setIsDirty(true);
    },
    []
  );

  const updateField = useCallback(
    (id: string, changes: Partial<FieldPosition>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...changes } : f))
      );
      setIsDirty(true);
    },
    []
  );

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await apiPut(`${fieldsEndpoint ?? `/api/v1/documents/${documentId}/fields`}`, { fields });
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Failed to save fields:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [documentId, fieldsEndpoint, fields]);

  // Debounced auto-save: when isDirty becomes true, wait 3 seconds then save.
  // Resets the timer on every change to fields. Cleans up on unmount.
  useEffect(() => {
    if (!isDirty || fields.length === 0) return;

    const timer = setTimeout(() => {
      save().catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [fields, isDirty, save]);

  return {
    fields,
    addField,
    updateField,
    removeField,
    save,
    loading,
    saving,
    isDirty,
    loadFields,
    lastSavedAt,
  };
}
