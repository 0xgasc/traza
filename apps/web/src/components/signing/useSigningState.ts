'use client';

import { useState, useMemo, useCallback } from 'react';

interface FieldPosition {
  id: string;
  fieldType: string;
  required?: boolean;
}

interface FieldValuePayload {
  fieldId: string;
  value: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useSigningState(fields: FieldPosition[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFieldValue = useCallback((fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const requiredFields = useMemo(
    () => fields.filter((f) => f.required !== false),
    [fields]
  );

  const totalRequired = requiredFields.length;

  const filledCount = useMemo(
    () =>
      requiredFields.filter((f) => {
        const v = values[f.id];
        return v !== undefined && v !== '';
      }).length,
    [requiredFields, values]
  );

  const allRequiredFilled = totalRequired > 0 && filledCount === totalRequired;

  const submit = useCallback(
    async (token: string) => {
      setSubmitting(true);
      setError(null);

      const fieldValues: FieldValuePayload[] = Object.entries(values)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([fieldId, value]) => ({ fieldId, value }));

      try {
        const res = await fetch(`${API_BASE}/api/v1/sign/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldValues }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to submit signature.');
        }

        setSubmitted(true);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Submission failed';
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [values]
  );

  return {
    values,
    setFieldValue,
    allRequiredFilled,
    filledCount,
    totalRequired,
    submit,
    submitting,
    submitted,
    error,
  };
}
