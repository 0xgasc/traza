"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface Template {
  id: string;
  name: string;
}

interface RecipientRow {
  id: string;
  signerRoleMap: Record<string, string>; // role -> email
  signerNames: Record<string, string>;   // role -> name
}

interface BulkResult {
  row: number;
  success: boolean;
  documentId?: string;
  error?: string;
}

function generateRowId() {
  return "row_" + Math.random().toString(36).slice(2, 10);
}

function emptyRow(roles: string[]): RecipientRow {
  const emailMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  roles.forEach((r) => { emailMap[r] = ""; nameMap[r] = ""; });
  return { id: generateRowId(), signerRoleMap: emailMap, signerNames: nameMap };
}

function parseCsv(text: string): string[][] {
  return text.trim().split("\n").map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
}

export default function BulkSendPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");

  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tmpl, fetchedRoles] = await Promise.all([
          apiGet<Template>("/api/v1/templates/" + id),
          apiGet<string[]>("/api/v1/templates/" + id + "/signer-roles"),
        ]);
        setTemplate(tmpl);
        setRoles(fetchedRoles);
        setRows([emptyRow(fetchedRoles)]);
      } catch {
        setError("Failed to load template.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ---- Manual mode helpers ----
  const addRow = () => setRows((prev) => [...prev, emptyRow(roles)]);

  const removeRow = (rowId: string) =>
    setRows((prev) => prev.filter((r) => r.id !== rowId));

  const updateEmail = (rowId: string, role: string, val: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, signerRoleMap: { ...r.signerRoleMap, [role]: val } } : r
      )
    );

  const updateName = (rowId: string, role: string, val: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, signerNames: { ...r.signerNames, [role]: val } } : r
      )
    );

  // ---- CSV mode helpers ----
  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("CSV must have a header row and at least one data row.");
        return;
      }

      const headers = parsed[0].map((h) => h.toLowerCase().trim());

      // Map CSV columns to roles (email column: role name, name column: "name: role")
      const roleEmailIdx: Record<string, number> = {};
      const roleNameIdx: Record<string, number> = {};

      roles.forEach((role) => {
        const roleKey = role.toLowerCase().trim();
        const emailCol = headers.findIndex((h) => h === roleKey || h === `email: ${roleKey}`);
        const nameCol = headers.findIndex((h) => h === `name: ${roleKey}` || h === `${roleKey} name`);
        if (emailCol !== -1) roleEmailIdx[role] = emailCol;
        if (nameCol !== -1) roleNameIdx[role] = nameCol;
      });

      // If no role columns found, try positional: first col = email for role[0], etc.
      if (Object.keys(roleEmailIdx).length === 0 && roles.length > 0) {
        roles.forEach((role, i) => {
          if (i < headers.length) roleEmailIdx[role] = i;
        });
      }

      const newRows: RecipientRow[] = parsed.slice(1)
        .filter((row) => row.some((cell) => cell.trim() !== ""))
        .map((row) => {
          const emailMap: Record<string, string> = {};
          const nameMap: Record<string, string> = {};
          roles.forEach((role) => {
            emailMap[role] = roleEmailIdx[role] !== undefined ? (row[roleEmailIdx[role]] ?? "").trim() : "";
            nameMap[role] = roleNameIdx[role] !== undefined ? (row[roleNameIdx[role]] ?? "").trim() : "";
          });
          return { id: generateRowId(), signerRoleMap: emailMap, signerNames: nameMap };
        });

      if (newRows.length === 0) {
        setError("No valid rows found in CSV.");
        return;
      }

      setError("");
      setRows(newRows);
      setMode("manual"); // switch to manual to show preview & allow editing
    };
    reader.readAsText(file);
  };

  // ---- Send ----
  const handleSend = async () => {
    // Validate: every row needs at least one non-empty email
    const invalidRows = rows.filter((r) =>
      Object.values(r.signerRoleMap).every((email) => !email.trim())
    );
    if (invalidRows.length > 0) {
      setError(`${invalidRows.length} row(s) have no email addresses. Fill in all required fields.`);
      return;
    }

    setError("");
    setSending(true);

    try {
      const data = await apiPost<BulkResult[]>("/api/v1/templates/" + id + "/bulk-send", {
        rows: rows.map((r) => ({
          signerRoleMap: r.signerRoleMap,
          signerNames: r.signerNames,
        })),
        message: message.trim() || undefined,
        expiresInDays: parseInt(expiresInDays, 10),
      });
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-64 bg-stone-100 animate-pulse" />
      </div>
    );
  }

  // ---- Results screen ----
  if (results) {
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase">Bulk Send Results</h1>
            <p className="text-sm text-stone-500 font-mono mt-1">{template?.name?.toUpperCase()}</p>
          </div>
          <Link href={"/templates/" + id} className="btn-secondary">Back to Template</Link>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 p-4 border-4 border-black bg-white text-center">
            <p className="text-3xl font-black text-green-600">{successCount}</p>
            <p className="text-xs font-mono text-stone-500 uppercase mt-1">Sent</p>
          </div>
          {failCount > 0 && (
            <div className="flex-1 p-4 border-4 border-red-500 bg-red-50 text-center">
              <p className="text-3xl font-black text-red-600">{failCount}</p>
              <p className="text-xs font-mono text-red-500 uppercase mt-1">Failed</p>
            </div>
          )}
          <div className="flex-1 p-4 border-4 border-stone-200 bg-white text-center">
            <p className="text-3xl font-black">{results.length}</p>
            <p className="text-xs font-mono text-stone-500 uppercase mt-1">Total</p>
          </div>
        </div>

        <div className="border-4 border-black bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-4 border-black bg-stone-50">
                <th className="px-4 py-3 text-left font-bold uppercase text-xs tracking-wide w-16">#</th>
                <th className="px-4 py-3 text-left font-bold uppercase text-xs tracking-wide">Status</th>
                <th className="px-4 py-3 text-left font-bold uppercase text-xs tracking-wide">Document</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.row} className="border-b-2 border-stone-100">
                  <td className="px-4 py-3 font-mono text-stone-500">{r.row}</td>
                  <td className="px-4 py-3">
                    {r.success ? (
                      <span className="inline-block px-2 py-0.5 bg-green-100 border border-green-400 text-green-700 text-xs font-bold uppercase">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-red-100 border border-red-400 text-red-700 text-xs font-bold uppercase">
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.documentId ? (
                      <Link href={"/documents/" + r.documentId} className="underline hover:no-underline">
                        {r.documentId}
                      </Link>
                    ) : (
                      <span className="text-red-600">{r.error || "Unknown error"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/documents" className="btn">View Documents</Link>
          <button
            onClick={() => { setResults(null); setRows([emptyRow(roles)]); }}
            className="btn-secondary"
          >
            Send Another Batch
          </button>
        </div>
      </div>
    );
  }

  const hasNoRoles = roles.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Bulk Send</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">{template?.name?.toUpperCase()}</p>
        </div>
        <Link href={"/templates/" + id} className="btn-secondary">Cancel</Link>
      </div>

      {hasNoRoles && (
        <div className="p-4 border-4 border-yellow-400 bg-yellow-50 mb-6">
          <p className="text-sm font-semibold mb-1">No signer roles in this template</p>
          <p className="text-sm text-stone-600 mb-3">Add signature fields with signer roles before bulk sending.</p>
          <Link href={"/templates/" + id + "/prepare"} className="text-sm font-bold underline">Edit Fields →</Link>
        </div>
      )}

      {!hasNoRoles && (
        <>
          {/* Mode switcher */}
          <div className="flex border-4 border-black mb-6 bg-white w-fit">
            {(["manual", "csv"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-6 py-2 font-bold text-sm uppercase tracking-wide transition-colors ${
                  mode === m ? "bg-black text-white" : "bg-white text-black hover:bg-stone-100"
                }`}
              >
                {m === "manual" ? "Manual Entry" : "CSV Upload"}
              </button>
            ))}
          </div>

          {mode === "csv" && (
            <div className="border-4 border-black bg-white p-6 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">Upload CSV</h2>
              <p className="text-sm text-stone-600 mb-4">
                CSV headers should match role names. For names, use{" "}
                <span className="font-mono bg-stone-100 px-1">Name: {roles[0] || "Role Name"}</span> columns.
              </p>
              <div className="mb-3 p-3 border-2 border-stone-200 bg-stone-50 font-mono text-xs overflow-x-auto whitespace-nowrap">
                {roles.join(", ")}{roles.length > 0 ? ", " : ""}{roles.map((r) => `Name: ${r}`).join(", ")}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                Choose CSV File
              </button>
              <p className="text-xs text-stone-500 mt-2 font-mono">MAX 100 ROWS</p>
            </div>
          )}

          {/* Recipient table */}
          {rows.length > 0 && (
            <div className="border-4 border-black bg-white mb-6 overflow-x-auto">
              <div className="p-4 border-b-4 border-black flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
                  Recipients ({rows.length})
                </h2>
                {rows.length < 100 && (
                  <button
                    onClick={addRow}
                    className="px-4 py-1.5 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    + Add Row
                  </button>
                )}
              </div>
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-stone-50 border-b-2 border-stone-200">
                    <th className="px-3 py-2 text-left font-bold uppercase text-xs tracking-wide text-stone-400 w-10">#</th>
                    {roles.map((role) => (
                      <th
                        key={role}
                        colSpan={2}
                        className="px-3 py-2 text-left font-bold uppercase text-xs tracking-wide border-l-2 border-stone-200"
                      >
                        {role}
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                  <tr className="bg-stone-50 border-b-2 border-stone-200">
                    <th />
                    {roles.map((role) => (
                      <>
                        <th key={role + "-email"} className="px-3 py-1 text-left font-mono text-[10px] text-stone-400 border-l-2 border-stone-200">
                          EMAIL
                        </th>
                        <th key={role + "-name"} className="px-3 py-1 text-left font-mono text-[10px] text-stone-400">
                          NAME
                        </th>
                      </>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-3 py-2 font-mono text-xs text-stone-400">{idx + 1}</td>
                      {roles.map((role) => (
                        <>
                          <td key={role + "-email"} className="px-2 py-1 border-l-2 border-stone-100">
                            <input
                              type="email"
                              value={row.signerRoleMap[role] ?? ""}
                              onChange={(e) => updateEmail(row.id, role, e.target.value)}
                              placeholder="email@example.com"
                              className="w-full min-w-[160px] px-2 py-1 border-2 border-stone-200 focus:border-black outline-none text-xs font-mono"
                            />
                          </td>
                          <td key={role + "-name"} className="px-2 py-1">
                            <input
                              type="text"
                              value={row.signerNames[role] ?? ""}
                              onChange={(e) => updateName(row.id, role, e.target.value)}
                              placeholder="Full name"
                              className="w-full min-w-[120px] px-2 py-1 border-2 border-stone-200 focus:border-black outline-none text-xs"
                            />
                          </td>
                        </>
                      ))}
                      <td className="px-2 py-1">
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(row.id)}
                            className="w-6 h-6 flex items-center justify-center bg-stone-100 border border-stone-300 text-stone-400 hover:bg-red-100 hover:text-red-600 hover:border-red-300 transition-colors text-xs font-bold"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap gap-6 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold uppercase tracking-wide mb-2">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input w-full h-20 resize-none"
                placeholder="Message sent to all signers..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wide mb-2">Expiration</label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="input"
              >
                <option value="3">3 Days</option>
                <option value="7">7 Days (default)</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 border-4 border-black bg-stone-100">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || rows.length === 0}
            className={[
              "btn px-10 py-4 text-base",
              sending ? "opacity-50 cursor-wait" : "",
            ].join(" ")}
          >
            {sending
              ? `Sending ${rows.length} envelope${rows.length !== 1 ? "s" : ""}...`
              : `Send ${rows.length} Envelope${rows.length !== 1 ? "s" : ""}`}
          </button>
        </>
      )}
    </div>
  );
}
