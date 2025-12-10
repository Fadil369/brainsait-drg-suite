import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ChatBoardEntity, PatientEntity, ClaimEntity, CodingJobEntity, EncounterEntity, NudgeEntity, AuditLogEntity, PaymentEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { CodingJob, SuggestedCode, Nudge } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
  // USERS
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });
  // CHATS
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await ChatBoardEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });
  // MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chat = new ChatBoardEntity(c.env, c.req.param('chatId'));
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.listMessages());
  });
  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = (await c.req.json()) as { userId?: string; text?: string };
    if (!isStr(userId) || !text?.trim()) return bad(c, 'userId and text required');
    const chat = new ChatBoardEntity(c.env, chatId);
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.sendMessage(userId, text.trim()));
  });
  // DELETE: Users
  app.delete('/api/users/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await UserEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/users/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await UserEntity.deleteMany(c.env, list), ids: list });
  });
  // DELETE: Chats
  app.delete('/api/chats/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await ChatBoardEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/chats/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await ChatBoardEntity.deleteMany(c.env, list), ids: list });
  });
  // --- SOLVENTUM DRG SUITE ROUTES ---
  // Ensure all seed data is present
  const ensureAllSeeds = async (env: Env) => {
    await Promise.all([
      PatientEntity.ensureSeed(env),
      EncounterEntity.ensureSeed(env),
      ClaimEntity.ensureSeed(env),
      CodingJobEntity.ensureSeed(env),
      NudgeEntity.ensureSeed(env),
      AuditLogEntity.ensureSeed(env),
      PaymentEntity.ensureSeed(env),
    ]);
  };
  // GET Claims (paginated and filterable)
  app.get('/api/claims', async (c) => {
    await ensureAllSeeds(c.env);
    const status = c.req.query('status');
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const { items, next } = await ClaimEntity.list(c.env, cursor, limit);
    const filteredItems = status ? items.filter(claim => claim.status === status) : items;
    return ok(c, { items: filteredItems, next });
  });
  // GET Coding Jobs (paginated)
  app.get('/api/coding-jobs', async (c) => {
    await ensureAllSeeds(c.env);
    const limit = Number(c.req.query('limit') ?? 5);
    const cursor = c.req.query('cursor');
    const page = await CodingJobEntity.list(c.env, cursor, limit);
    return ok(c, page);
  });
  // POST Ingest Note (mock coding engine)
  app.post('/api/ingest-note', async (c) => {
    const { clinical_note } = (await c.req.json()) as { clinical_note?: string };
    if (!isStr(clinical_note)) return bad(c, 'clinical_note is required');
    // Mock NLP
    const noteLower = clinical_note.toLowerCase();
    const suggested_codes: SuggestedCode[] = [];
    if (noteLower.includes('pneumonia')) {
      suggested_codes.push({ code: 'J18.9', desc: 'Pneumonia, unspecified', confidence: 0.85 });
    }
    if (noteLower.includes('myocardial infarction')) {
        suggested_codes.push({ code: 'I21.9', desc: 'Acute MI, unspecified', confidence: 0.99 });
    }
    if (noteLower.includes('cough')) {
        suggested_codes.push({ code: 'R05', desc: 'Cough', confidence: 0.95 });
    }
    const confidence_score = suggested_codes.length > 0 ? suggested_codes.reduce((acc, code) => acc + code.confidence, 0) / suggested_codes.length : 0;
    let phase: CodingJob['phase'] = 'CAC';
    let status: CodingJob['status'] = 'NEEDS_REVIEW';
    if (confidence_score > 0.98) {
        phase = 'AUTONOMOUS';
        status = 'SENT_TO_NPHIES';
    } else if (confidence_score > 0.90) {
        phase = 'SEMI_AUTONOMOUS';
        status = 'AUTO_DROP';
    }
    // Create a mock encounter to link the job to
    const encounters = await EncounterEntity.list(c.env, null, 1);
    const encounter_id = encounters.items.length > 0 ? encounters.items[0].id : 'e_mock';
    const newJob: CodingJob = {
      id: crypto.randomUUID(),
      encounter_id,
      suggested_codes,
      status,
      confidence_score,
      phase,
      created_at: new Date().toISOString(),
    };
    await CodingJobEntity.create(c.env, newJob);
    return ok(c, newJob);
  });
  // GET Nudges
  app.get('/api/nudges', async (c) => {
    await ensureAllSeeds(c.env);
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const page = await NudgeEntity.list(c.env, cursor, limit);
    return ok(c, page);
  });
  // POST Apply Nudge (mock)
  app.post('/api/nudges/:id/apply', async (c) => {
    const nudgeId = c.req.param('id');
    const nudge = new NudgeEntity(c.env, nudgeId);
    if (!await nudge.exists()) return notFound(c, 'nudge not found');
    await nudge.patch({ status: 'resolved' });
    return ok(c, { id: nudgeId, status: 'resolved' });
  });
  // GET Audit Logs
  app.get('/api/audit-logs', async (c) => {
    await ensureAllSeeds(c.env);
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const page = await AuditLogEntity.list(c.env, cursor, limit);
    // In a real app, you'd filter by date range from query params
    return ok(c, page);
  });
  // GET Payments
  app.get('/api/payments', async (c) => {
    await ensureAllSeeds(c.env);
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const page = await PaymentEntity.list(c.env, cursor, limit);
    return ok(c, page);
  });
  // POST Reconcile Batch (mock)
  app.post('/api/reconcile-batch', async (c) => {
    // This is a mock endpoint. In a real app, this would trigger a background job.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
    return ok(c, { status: 'completed', reconciled_count: 2 });
  });
}