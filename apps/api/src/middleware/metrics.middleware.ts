import { Request, Response, NextFunction } from 'express';

// --- In-memory metrics store ---

const HISTOGRAM_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 5];

interface RequestMetric {
  count: number;
}

interface HistogramData {
  buckets: number[]; // counts per bucket
  sum: number;
  count: number;
}

const requestCounts = new Map<string, RequestMetric>();
const durationHistograms = new Map<string, HistogramData>();

// Global (unlabeled) histogram for overall request duration
let globalHistogram: HistogramData = {
  buckets: new Array(HISTOGRAM_BUCKETS.length).fill(0),
  sum: 0,
  count: 0,
};

function getCounterKey(method: string, route: string, status: number): string {
  return `${method}|${route}|${status}`;
}

function normalizeRoute(req: Request): string {
  // Use the matched route pattern if available, otherwise the path
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  // Fall back to the original URL path (strip query string)
  return req.originalUrl?.split('?')[0] || req.path;
}

function recordDuration(durationSec: number): void {
  globalHistogram.count++;
  globalHistogram.sum += durationSec;
  for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
    if (durationSec <= HISTOGRAM_BUCKETS[i]!) {
      globalHistogram.buckets[i] = (globalHistogram.buckets[i] ?? 0) + 1;
    }
  }
}

// --- Middleware ---

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    const route = normalizeRoute(req);
    const method = req.method;
    const status = res.statusCode;

    // Increment counter
    const key = getCounterKey(method, route, status);
    const existing = requestCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      requestCounts.set(key, { count: 1 });
    }

    // Record duration in global histogram
    recordDuration(durationSec);
  });

  next();
}

// --- /metrics handler ---

export function metricsHandler(_req: Request, res: Response): void {
  const lines: string[] = [];

  // http_requests_total counter
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, metric] of requestCounts) {
    const [method, route, status] = key.split('|');
    lines.push(
      `http_requests_total{method="${method}",route="${route}",status="${status}"} ${metric.count}`,
    );
  }

  // http_request_duration_seconds histogram
  lines.push('');
  lines.push('# HELP http_request_duration_seconds HTTP request duration');
  lines.push('# TYPE http_request_duration_seconds histogram');
  let cumulativeCount = 0;
  for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
    cumulativeCount += globalHistogram.buckets[i] ?? 0;
    lines.push(
      `http_request_duration_seconds_bucket{le="${HISTOGRAM_BUCKETS[i]}"} ${cumulativeCount}`,
    );
  }
  lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${globalHistogram.count}`);
  lines.push(`http_request_duration_seconds_sum ${globalHistogram.sum}`);
  lines.push(`http_request_duration_seconds_count ${globalHistogram.count}`);

  // node_process_uptime_seconds gauge
  lines.push('');
  lines.push('# HELP node_process_uptime_seconds Process uptime');
  lines.push('# TYPE node_process_uptime_seconds gauge');
  lines.push(`node_process_uptime_seconds ${Math.floor(process.uptime())}`);

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
}
