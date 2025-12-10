// Making changes to this file is **STRICTLY** forbidden. Please add your routes in `userRoutes.ts` file.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { userRoutes } from './user-routes';
import { Env, GlobalDurableObject } from './core-utils';

// Need to export GlobalDurableObject to make it available in wrangler
export { GlobalDurableObject };
export interface ClientErrorReport {
    message: string;
    url: string;
    timestamp: string;
    stack?: string;
    componentStack?: string;
    errorBoundary?: boolean;
    errorBoundaryProps?: Record<string, unknown>;
    source?: string;
    lineno?: number;
    colno?: number;
    error?: unknown;
  }
const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());

// Security: CORS configuration - restrict origins in production
const allowedOrigins = [
  'https://brainsait-drg-suite.pages.dev',
  'https://brainsait.com',
  /\.pages\.dev$/,  // Allow Cloudflare Pages preview deployments
];

app.use('/api/*', cors({
  origin: (origin) => {
    // Allow same-origin requests (no Origin header)
    if (!origin) return '*';

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });

    return isAllowed ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

userRoutes(app);

app.get('/api/health', (c) => c.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() }}));

// Rate limiting map for error reporting (simple in-memory, use Durable Objects for production)
const errorReportLimits = new Map<string, number>();

app.post('/api/client-errors', async (c) => {
  try {
    const e = await c.req.json<ClientErrorReport>();

    // Simple rate limiting: max 10 errors per IP per minute
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const key = `${clientIP}:${Math.floor(now / 60000)}`;
    const count = errorReportLimits.get(key) || 0;

    if (count > 10) {
      return c.json({ success: false, error: 'Rate limit exceeded' }, 429);
    }

    errorReportLimits.set(key, count + 1);

    // Clean up old entries (keep only last 2 minutes)
    const cutoff = Math.floor(now / 60000) - 2;
    for (const [k] of errorReportLimits) {
      const timestamp = parseInt(k.split(':')[1]);
      if (timestamp < cutoff) {
        errorReportLimits.delete(k);
      }
    }

    // Log securely (no sensitive data)
    console.error('[CLIENT ERROR]', JSON.stringify({
      timestamp: e.timestamp || new Date().toISOString(),
      message: e.message?.substring(0, 200), // Limit message length
      url: e.url,
      errorBoundary: e.errorBoundary,
      source: e.source
    }, null, 2));

    return c.json({ success: true });
  } catch (error) {
    console.error('[CLIENT ERROR HANDLER] Failed:', error instanceof Error ? error.message : 'Unknown error');
    return c.json({ success: false, error: 'Failed to process' }, 500);
  }
});

app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));
app.onError((err, c) => {
  // Security: Don't expose internal error details in production
  const isDev = c.env?.ENVIRONMENT === 'development';
  console.error('[ERROR]', err instanceof Error ? err.message : String(err));

  return c.json({
    success: false,
    error: isDev ? (err instanceof Error ? err.message : String(err)) : 'Internal Server Error'
  }, 500);
});

// Server initialization (only log in development)
// console.log('Server is running')

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;