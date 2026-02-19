'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FieldPosition } from '@/components/pdf/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('traza_access_token');
}

async function apiFetch<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `Request failed with status ${res.status}`;
    try { const d = await res.json(); msg = d.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function generateId(): string {
  return 'tfield_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// Template fields use signerRole instead of signerEmail
export interface TemplateFieldPosition extends Omit<FieldPosition, 'signerEmail'> {
  signerRole: string;
  signerEmail: string; // Used as signerRole in the UI (for FieldPlacer compatibility)
}

export function useTemplateFieldPlacement(templateId: string) {
  const [fields, setFields] = useState<TemplateFieldPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const orderCounter = useRef(0);

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>('GET', `/api/v1/templates/${templateId}`);
      const rawFields = data?.fields || data?.data?.fields || [];
      const mapped: TemplateFieldPosition[] = rawFields.map((f: any) => ({
        id: f.id,
        fieldType: f.fieldType,
        page: f.page,
        positionX: typeof f.positionX === 'object' ? Number(f.positionX) : Number(f.positionX),
        positionY: typeof f.positionY === 'object' ? Number(f.positionY) : Number(f.positionY),
        width: typeof f.width === 'object' ? Number(f.width) : Number(f.width),
        height: typeof f.height === 'object' ? Number(f.height) : Number(f.height),
        signerRole: f.signerRole || 'Signer 1',
        signerEmail: f.signerRole || 'Signer 1', // alias for FieldPlacer compatibility
        signerName: f.signerRole || 'Signer 1',
        required: f.required ?? true,
        label: f.label,
        order: f.order ?? 0,
      }));
      setFields(mapped);
      orderCounter.current = mapped.length;
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load template fields:', err);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const addField = useCallback(
    (fieldType: string, page: number, signerRole: string, signerName?: string, posX?: number, posY?: number) => {
      const newField: TemplateFieldPosition = {
        id: generateId(),
        fieldType: fieldType as FieldPosition['fieldType'],
        page,
        positionX: posX ?? 35,
        positionY: posY ?? 40,
        width: 20,
        height: 5,
        signerRole,
        signerEmail: signerRole,
        signerName: signerName || signerRole,
        required: true,
        order: orderCounter.current++,
      };
      setFields((prev) => [...prev, newField]);
      setIsDirty(true);
    },
    []
  );

  const updateField = useCallback((id: string, changes: Partial<TemplateFieldPosition>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));
    setIsDirty(true);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch('PUT', `/api/v1/templates/${templateId}/fields`, {
        fields: fields.map((f) => ({
          signerRole: f.signerRole,
          fieldType: f.fieldType,
          page: f.page,
          positionX: f.positionX,
          positionY: f.positionY,
          width: f.width,
          height: f.height,
          required: f.required,
          label: f.label,
          order: f.order,
        })),
      });
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Failed to save template fields:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [templateId, fields]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty || fields.length === 0) return;
    const timer = setTimeout(() => {
      save().catch((err) => console.error('Auto-save failed:', err));
    }, 3000);
    return () => clearTimeout(timer);
  }, [fields, isDirty, save]);

  return { fields, addField, updateField, removeField, save, loading, saving, isDirty, loadFields, lastSavedAt };
}
