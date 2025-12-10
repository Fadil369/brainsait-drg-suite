import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ChatBoardEntity, PatientEntity, ClaimEntity, CodingJobEntity, EncounterEntity, NudgeEntity, AuditLogEntity, PaymentEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { CodingJob, SuggestedCode } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // --- SEEDING HELPER ---
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
  // --- DEMO ROUTES (can be removed) ---
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const page = await UserEntity.list(c.env, c.req.query('cursor') ?? null, 10);
    return ok(c, page);
  });
  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const page = await ChatBoardEntity.list(c.env, c.req.query('cursor') ?? null, 10);
    return ok(c, page);
  });
  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });
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
  // --- SOLVENTUM DRG SUITE ROUTES ---
  // GET Claims (paginated and filterable)
  app.get('/api/claims', async (c) => {
    await ensureAllSeeds(c.env);
    c.header('Cache-Control', 'public, max-age=60');
    const status = c.req.query('status');
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const { items, next } = await ClaimEntity.list(c.env, cursor, limit * 2); // Fetch more to filter
    const filteredItems = status && status !== 'all' ? items.filter(claim => claim.status === status) : items;
    return ok(c, { items: filteredItems.slice(0, limit), next });
  });
  // GET Coding Jobs (paginated)
  app.get('/api/coding-jobs', async (c) => {
    await ensureAllSeeds(c.env);
    c.header('Cache-Control', 'public, max-age=60');
    const limit = Number(c.req.query('limit') ?? 5);
    const cursor = c.req.query('cursor');
    const page = await CodingJobEntity.list(c.env, cursor, limit);
    return ok(c, page);
  });
  // POST Ingest Note (mock coding engine)
  app.post('/api/ingest-note', async (c) => {
    const { clinical_note } = (await c.req.json()) as { clinical_note?: string };
    if (!isStr(clinical_note)) return bad(c, 'clinical_note is required');
    const noteLower = clinical_note.toLowerCase();
    const suggested_codes: SuggestedCode[] = [];
    if (noteLower.includes('pneumonia')) suggested_codes.push({ code: 'J18.9', desc: 'Pneumonia, unspecified', confidence: 0.85 });
    if (noteLower.includes('myocardial infarction')) suggested_codes.push({ code: 'I21.9', desc: 'Acute MI, unspecified', confidence: 0.99 });
    if (noteLower.includes('cough')) suggested_codes.push({ code: 'R05', desc: 'Cough', confidence: 0.95 });
    const confidence_score = suggested_codes.length > 0 ? suggested_codes.reduce((acc, code) => acc + code.confidence, 0) / suggested_codes.length : 0;
    let phase: CodingJob['phase'] = 'CAC';
    let status: CodingJob['status'] = 'NEEDS_REVIEW';
    if (confidence_score > 0.98) { phase = 'AUTONOMOUS'; status = 'SENT_TO_NPHIES'; } 
    else if (confidence_score > 0.90) { phase = 'SEMI_AUTONOMOUS'; status = 'AUTO_DROP'; }
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
    await AuditLogEntity.create(c.env, { id: crypto.randomUUID(), actor: 'system', action: 'note.ingested', object_type: 'coding_job', object_id: newJob.id, occurred_at: new Date().toISOString() });
    return ok(c, newJob);
  });
  // GET Nudges
  app.get('/api/nudges', async (c) => {
    await ensureAllSeeds(c.env);
    c.header('Cache-Control', 'public, max-age=120');
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
    await AuditLogEntity.create(c.env, { id: crypto.randomUUID(), actor: 'user:mock_user', action: 'nudge.applied', object_type: 'nudge', object_id: nudgeId, occurred_at: new Date().toISOString() });
    return ok(c, { id: nudgeId, status: 'resolved' });
  });
  // GET Audit Logs
  app.get('/api/audit-logs', async (c) => {
    await ensureAllSeeds(c.env);
    c.header('Cache-Control', 'public, max-age=30');
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const page = await AuditLogEntity.list(c.env, cursor, limit);
    return ok(c, page);
  });
  // GET Integration Logs (filtered audit logs)
  app.get('/api/integration-logs', async (c) => {
    await ensureAllSeeds(c.env);
    c.header('Cache-Control', 'public, max-age=30');
    const { items } = await AuditLogEntity.list(c.env, null, 50);
    const integrationActions = ['nphies.token_refreshed', 'claim.submitted_to_nphies'];
    const filtered = items.filter(log => integrationActions.includes(log.action) || log.object_type === 'integration');
    return ok(c, { items: filtered.slice(0, 10) });
  });
  // GET Payments
  app.get('/api/payments', async (c) => {
    await ensureAllSeeds(c.env);
    c.header('Cache-Control', 'public, max-age=120');
    const limit = Number(c.req.query('limit') ?? 10);
    const cursor = c.req.query('cursor');
    const page = await PaymentEntity.list(c.env, cursor, limit);
    return ok(c, page);
  });
  // POST Reconcile Batch (mock)
  app.post('/api/reconcile-batch', async (c) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const { items } = await PaymentEntity.list(c.env);
    const unreconciled = items.filter(p => !p.reconciled);
    for (const payment of unreconciled.slice(0, 2)) { // Reconcile up to 2
        const pEntity = new PaymentEntity(c.env, payment.id);
        await pEntity.patch({ reconciled: true });
    }
    await AuditLogEntity.create(c.env, { id: crypto.randomUUID(), actor: 'system', action: 'payment.batch_reconciled', object_type: 'system_job', object_id: `job_${Date.now()}`, occurred_at: new Date().toISOString() });
    return ok(c, { status: 'completed', reconciled_count: Math.min(2, unreconciled.length) });
  });
}