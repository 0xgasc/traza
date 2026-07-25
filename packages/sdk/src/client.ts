export interface TrazaClientOptions {
  /** Org-scoped API key from Settings → API Keys */
  apiKey: string;
  /** API base URL. Defaults to production. */
  baseUrl?: string;
  /** Custom fetch implementation (defaults to global fetch, Node 18+) */
  fetch?: typeof fetch;
}

export interface Signer {
  email: string;
  name: string;
  order?: number;
}

export interface SendForSigningOptions {
  signers: Signer[];
  message?: string;
  /** Language for signer notifications */
  emailLocale?: "en" | "es";
  /** 1–90, defaults to 7 */
  expiresInDays?: number;
}

export interface VerifyByHashResult {
  found: boolean;
  matches?: number;
  status?: string;
  hashAlgorithm?: string;
  createdAt?: string;
  completedAt?: string | null;
  signerCount?: number;
  anchored?: boolean;
}

export class TrazaApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const code =
      typeof body === "object" && body !== null
        ? ((body as { error?: { code?: string; message?: string } }).error?.code ??
          undefined)
        : undefined;
    const message =
      typeof body === "object" && body !== null
        ? ((body as { error?: { message?: string } }).error?.message ??
          `Traza API error (HTTP ${status})`)
        : `Traza API error (HTTP ${status})`;
    super(message);
    this.name = "TrazaApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

const DEFAULT_BASE_URL = "https://traza-api-production.up.railway.app";

export class TrazaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TrazaClientOptions) {
    if (!options.apiKey) {
      throw new Error("TrazaClient requires an apiKey");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  private async request<T>(
    method: string,
    path: string,
    init?: { body?: FormData | string; headers?: Record<string, string>; auth?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = { ...init?.headers };
    if (init?.auth !== false) {
      headers["X-API-Key"] = this.apiKey;
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: init?.body,
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      throw new TrazaApiError(res.status, body);
    }
    return body as T;
  }

  readonly documents = {
    /**
     * Upload a PDF. It is hashed with SHA-256 server-side on arrival.
     * Accepts a Buffer/Uint8Array/Blob plus a file name.
     */
    create: async (input: {
      file: Blob | Uint8Array;
      fileName: string;
      title: string;
    }): Promise<{ id: string; fileHash: string; status: string } & Record<string, unknown>> => {
      const form = new FormData();
      const blob =
        input.file instanceof Blob
          ? input.file
          : new Blob([input.file], { type: "application/pdf" });
      form.append("file", blob, input.fileName);
      form.append("title", input.title);
      return this.request("POST", "/api/v1/documents", { body: form });
    },

    get: async (id: string): Promise<Record<string, unknown>> =>
      this.request("GET", `/api/v1/documents/${encodeURIComponent(id)}`),

    list: async (): Promise<unknown> => this.request("GET", "/api/v1/documents"),

    /** Send a document for signature. Each signer gets a secure link. */
    send: async (id: string, options: SendForSigningOptions): Promise<unknown> =>
      this.request("POST", `/api/v1/documents/${encodeURIComponent(id)}/send`, {
        body: JSON.stringify(options),
        headers: { "Content-Type": "application/json" },
      }),
  };

  readonly verify = {
    /** Public per-document verification record (signers, hash, anchor, audit). */
    byId: async (documentId: string): Promise<Record<string, unknown>> =>
      this.request("GET", `/api/v1/verify/${encodeURIComponent(documentId)}`, {
        auth: false,
      }),

    /**
     * Public verify-by-hash. Accepts a hex SHA-256 digest with or without
     * a "sha256:" prefix. Returns a minimal, PII-free result.
     */
    byHash: async (hash: string): Promise<VerifyByHashResult> =>
      this.request("GET", `/api/v1/verify/hash/${encodeURIComponent(hash)}`, {
        auth: false,
      }),
  };
}
