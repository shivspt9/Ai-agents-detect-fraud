import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

import { createStore } from './db/index.js';
import { detectScam, bandFor, SCAM_CATEGORIES } from './engine/detection.js';
import { extractIntelligence, flattenIntelligence, toValueMap, INTEL_TYPES } from './engine/extraction.js';
import { generateReply, PERSONAS, STAGES } from './engine/agent.js';
import { timeseries, countBy, turnHistogram, confidenceByType, toCsv } from './lib/analytics.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const store = await createStore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** Pushes an event to every connected dashboard. */
function broadcast(type, payload) {
  const frame = JSON.stringify({ type, payload, at: new Date().toISOString() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(frame);
  }
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({
    type: 'hello',
    payload: { storage: store.kind, clients: wss.clients.size },
    at: new Date().toISOString(),
  }));
});

/* ---------------------------------------------------------------- helpers */

const asArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function parseRange(query) {
  const from = query.from ? new Date(query.from).getTime() : null;
  const to = query.to ? new Date(query.to).getTime() : null;
  return {
    from: Number.isNaN(from) ? null : from,
    to: Number.isNaN(to) ? null : to,
  };
}

function inRange(value, { from, to }) {
  if (from === null && to === null) return true;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (from !== null && t < from) return false;
  if (to !== null && t > to) return false;
  return true;
}

function paginate(rows, query) {
  const limit = Math.min(Number(query.limit) || 50, 500);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { page: rows.slice(offset, offset + limit), total: rows.length, limit, offset };
}

/** Wraps an async handler so a rejection becomes a 500 instead of a hang. */
const route = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`[${req.method} ${req.path}]`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  });
};

/* ----------------------------------------------------------------- routes */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    storage: store.kind,
    storage_label: store.label,
    uptime_seconds: Math.round(process.uptime()),
    websocket_clients: wss.clients.size,
  });
});

/** Filter vocabularies, so the dashboard never hardcodes them. */
app.get('/api/meta', (req, res) => {
  res.json({
    scam_categories: SCAM_CATEGORIES,
    intel_types: INTEL_TYPES,
    stages: STAGES,
    personas: PERSONAS.map((p) => ({ id: p.id, name: p.name, occupation: p.occupation })),
    bands: ['critical', 'high', 'medium', 'low', 'none'],
  });
});

app.post('/api/honeypot-engage', route(async (req, res) => {
  const { conversation_id, message, timestamp } = req.body ?? {};

  if (typeof conversation_id !== 'string' || !conversation_id.trim()) {
    return res.status(400).json({ error: 'conversation_id is required' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 8000) {
    return res.status(400).json({ error: 'message exceeds 8000 characters' });
  }

  const convId = conversation_id.trim();
  const now = new Date().toISOString();

  const existing = await store.getConversation(convId);
  const extracted = extractIntelligence(message);
  const detection = detectScam(message, extracted, existing);

  // Only record intel this conversation has not already given us.
  const known = await store.knownIntelValues(convId);
  const newIntel = flattenIntelligence(extracted)
    .filter((row) => !known.has(`${row.intel_type}:${row.value}`))
    .map((row) => ({
      id: randomUUID(),
      conversation_id: convId,
      intel_type: row.intel_type,
      value: row.value,
      confidence: row.confidence,
      note: row.note,
      context: message.slice(0, 200),
      extracted_at: now,
    }));

  if (newIntel.length) await store.insertIntelligence(newIntel);

  const allIntel = (await store.listIntelligence()).filter((i) => i.conversation_id === convId);
  const collectedTypes = [...new Set(allIntel.map((i) => i.intel_type))];

  const turnCount = (existing?.turn_count ?? 0) + 1;

  const priorMessages = await store.listMessages(convId);
  const recentReplies = priorMessages
    .filter((m) => m.role === 'agent')
    .slice(-4)
    .map((m) => m.content);

  const { reply, stage, goal, strategy, persona } = generateReply({
    conversationId: convId,
    message,
    turnCount,
    collectedTypes,
    detection,
    recentReplies,
  });

  const scammerMessage = {
    id: randomUUID(),
    conversation_id: convId,
    role: 'scammer',
    content: message,
    timestamp: timestamp && !Number.isNaN(Date.parse(timestamp))
      ? new Date(timestamp).toISOString()
      : now,
    intel_found: newIntel.map((i) => ({ type: i.intel_type, value: i.value })),
    threat_score: detection.threat_score,
  };

  const agentMessage = {
    id: randomUUID(),
    conversation_id: convId,
    role: 'agent',
    content: reply,
    timestamp: new Date(Date.now() + 1).toISOString(),
    stage,
    strategy,
    goal,
  };

  await store.insertMessage(scammerMessage);
  await store.insertMessage(agentMessage);

  // Classification is sticky. A scammer who identified themselves as a KYC
  // fraud on turn 1 and then sends a bare "ok" is still a KYC fraud, so a
  // turn that names no category must not overwrite one that did.
  const namesCategory = detection.is_scam && detection.scam_type !== 'generic_scam';
  const hadCategory = existing?.scam_type && existing.scam_type !== 'unknown';

  const scamType = namesCategory
    ? detection.scam_type
    : hadCategory ? existing.scam_type : detection.scam_type;
  const scamLabel = namesCategory
    ? detection.scam_label
    : hadCategory ? existing.scam_label : detection.scam_label;

  // Peak confidence, so the threat feed reflects the worst this conversation
  // ever looked rather than only its most recent turn.
  const peakConfidence = Math.max(detection.confidence, existing?.scam_confidence ?? 0);

  // Signals accumulate across turns. An analyst wants every tell the scammer
  // has shown, not just the ones in whatever they typed most recently.
  const signalsById = new Map(
    (existing?.signals ?? []).map((s) => [s.id, s])
  );
  for (const signal of detection.signals) {
    const prev = signalsById.get(signal.id);
    if (!prev || signal.weight > prev.weight) signalsById.set(signal.id, signal);
  }
  const mergedSignals = [...signalsById.values()].sort((a, b) => b.weight - a.weight);

  const conversation = {
    ...(existing ?? {}),
    id: existing?.id ?? randomUUID(),
    conversation_id: convId,
    status: stage === 'closing' ? 'closed' : 'active',
    scam_detected: detection.is_scam || Boolean(existing?.scam_detected),
    scam_type: scamType,
    scam_label: scamLabel,
    scam_confidence: peakConfidence,
    current_confidence: detection.confidence,
    threat_score: Math.round(peakConfidence * 100),
    // Band must describe the same number the score shows, so it is derived
    // from the peak too — not from whatever the latest turn happened to score.
    band: bandFor(peakConfidence),
    raw_score: detection.raw_score,
    signals: mergedSignals,
    category_scores: detection.category_scores,
    agent_active: stage !== 'closing',
    stage,
    goal,
    strategy,
    persona: { id: persona.id, name: persona.name, occupation: persona.occupation },
    collected_types: collectedTypes,
    intel_count: allIntel.length,
    turn_count: turnCount,
    first_contact_at: existing?.first_contact_at ?? now,
    last_activity_at: now,
  };

  await store.saveConversation(conversation);

  broadcast('engagement', {
    conversation,
    messages: [scammerMessage, agentMessage],
    intelligence: newIntel,
  });

  res.json({
    scam_detected: detection.is_scam,
    scam_type: conversation.scam_type,
    scam_label: conversation.scam_label,
    scam_confidence: detection.confidence,
    threat_score: detection.threat_score,
    band: detection.band,
    signals: detection.signals,
    agent_active: conversation.agent_active,
    agent_reply: reply,
    conversation_stage: stage,
    agent_strategy: strategy,
    agent_goal: goal,
    agent_persona: conversation.persona,
    confidence_score: detection.confidence,
    engagement_metrics: {
      turns: turnCount,
      conversation_id: convId,
      intel_collected: allIntel.length,
      new_intel: newIntel.length,
    },
    extracted_intelligence: toValueMap(extracted),
  });
}));

app.get('/api/honeypot-stats', route(async (req, res) => {
  const conversations = await store.listConversations();
  const intelligence = await store.listIntelligence();

  const total = conversations.length;
  const scams = conversations.filter((c) => c.scam_detected).length;
  // An "engagement" is the agent actively working a confirmed scam, so
  // benign conversations must not inflate it.
  const active = conversations.filter(
    (c) => c.scam_detected && c.agent_active && c.status === 'active'
  ).length;
  const totalTurns = conversations.reduce((a, c) => a + (c.turn_count || 0), 0);

  const recent = [...conversations]
    .sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at))
    .slice(0, 10)
    .map((c) => ({
      conversation_id: c.conversation_id,
      status: c.status,
      scam_type: c.scam_type,
      scam_label: c.scam_label,
      threat_score: c.threat_score,
      band: c.band,
      turns: c.turn_count,
      last_activity: c.last_activity_at,
    }));

  res.json({
    overview: {
      total_conversations: total,
      scams_detected: scams,
      active_engagements: active,
      total_intelligence: intelligence.length,
      detection_rate: total > 0 ? `${((scams / total) * 100).toFixed(1)}%` : '0%',
      avg_turns_per_conversation: total > 0 ? (totalTurns / total).toFixed(1) : '0',
    },
    intelligence_breakdown: countBy(intelligence, 'intel_type'),
    scam_type_breakdown: countBy(conversations.filter((c) => c.scam_detected), 'scam_type'),
    band_breakdown: countBy(conversations, 'band'),
    recent_activity: recent,
  });
}));

app.get('/api/analytics', route(async (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 24, 24 * 30);
  const conversations = await store.listConversations();
  const intelligence = await store.listIntelligence();

  res.json({
    window_hours: hours,
    conversations_over_time: timeseries(conversations, 'first_contact_at', { hours }),
    intelligence_over_time: timeseries(intelligence, 'extracted_at', { hours }),
    scam_type_breakdown: countBy(conversations.filter((c) => c.scam_detected), 'scam_label'),
    intel_type_breakdown: countBy(intelligence, 'intel_type'),
    band_breakdown: countBy(conversations, 'band'),
    stage_breakdown: countBy(conversations, 'stage'),
    turn_histogram: turnHistogram(conversations),
    confidence_by_type: confidenceByType(intelligence),
    top_targets: Object.entries(countBy(intelligence, 'value'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count })),
  });
}));

/** Filtered, searchable, paginated conversation list. */
app.get('/api/conversations', route(async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const types = asArray(req.query.scam_type);
  const bands = asArray(req.query.band);
  const statuses = asArray(req.query.status);
  const minConfidence = Number(req.query.min_confidence) || 0;
  const range = parseRange(req.query);

  let rows = await store.listConversations();

  if (types.length) rows = rows.filter((c) => types.includes(c.scam_type));
  if (bands.length) rows = rows.filter((c) => bands.includes(c.band));
  if (statuses.length) rows = rows.filter((c) => statuses.includes(c.status));
  if (minConfidence > 0) rows = rows.filter((c) => (c.scam_confidence ?? 0) >= minConfidence);
  rows = rows.filter((c) => inRange(c.last_activity_at, range));

  if (q) {
    const messages = await store.listAllMessages();
    const matchingIds = new Set(
      messages.filter((m) => m.content?.toLowerCase().includes(q)).map((m) => m.conversation_id)
    );
    rows = rows.filter(
      (c) =>
        c.conversation_id.toLowerCase().includes(q) ||
        (c.scam_label ?? '').toLowerCase().includes(q) ||
        matchingIds.has(c.conversation_id)
    );
  }

  rows.sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at));

  const { page, total, limit, offset } = paginate(rows, req.query);
  res.json({ data: page, total, limit, offset });
}));

/** Everything the deep-dive view needs, in one round trip. */
app.get('/api/conversations/:id', route(async (req, res) => {
  const conversation = await store.getConversation(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = (await store.listMessages(req.params.id)).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const intelligence = (await store.listIntelligence())
    .filter((i) => i.conversation_id === req.params.id)
    .sort((a, b) => new Date(b.extracted_at) - new Date(a.extracted_at));

  // Stage changes over the conversation, for the timeline strip.
  const timeline = [];
  let lastStage = null;
  for (const m of messages) {
    if (m.role === 'agent' && m.stage && m.stage !== lastStage) {
      timeline.push({ stage: m.stage, at: m.timestamp, strategy: m.strategy });
      lastStage = m.stage;
    }
  }

  res.json({ conversation, messages, intelligence, timeline });
}));

app.get('/api/conversations/:id/messages', route(async (req, res) => {
  const messages = (await store.listMessages(req.params.id)).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  res.json(messages);
}));

/** Filtered, searchable intelligence list. */
app.get('/api/intelligence', route(async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const types = asArray(req.query.type);
  const minConfidence = Number(req.query.min_confidence) || 0;
  const range = parseRange(req.query);

  let rows = await store.listIntelligence();

  if (types.length) rows = rows.filter((i) => types.includes(i.intel_type));
  if (req.query.conversation_id) {
    rows = rows.filter((i) => i.conversation_id === req.query.conversation_id);
  }
  if (minConfidence > 0) rows = rows.filter((i) => (i.confidence ?? 0) >= minConfidence);
  rows = rows.filter((i) => inRange(i.extracted_at, range));
  if (q) {
    rows = rows.filter(
      (i) =>
        i.value.toLowerCase().includes(q) ||
        (i.context ?? '').toLowerCase().includes(q) ||
        i.conversation_id.toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => new Date(b.extracted_at) - new Date(a.extracted_at));

  // The dashboard reads a bare array; `?paginated=1` opts into the envelope.
  if (req.query.paginated) {
    const { page, total, limit, offset } = paginate(rows, req.query);
    return res.json({ data: page, total, limit, offset });
  }
  res.json(rows);
}));

/** CSV / JSON download of the current findings. */
app.get('/api/export/:resource', route(async (req, res) => {
  const { resource } = req.params;
  const format = String(req.query.format ?? 'json').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  let rows;
  let columns;
  if (resource === 'intelligence') {
    rows = await store.listIntelligence();
    columns = ['id', 'conversation_id', 'intel_type', 'value', 'confidence', 'note', 'context', 'extracted_at'];
  } else if (resource === 'conversations') {
    rows = await store.listConversations();
    columns = ['conversation_id', 'status', 'scam_detected', 'scam_type', 'scam_label', 'scam_confidence', 'threat_score', 'band', 'stage', 'turn_count', 'intel_count', 'first_contact_at', 'last_activity_at'];
  } else {
    return res.status(404).json({ error: `Unknown export resource: ${resource}` });
  }

  if (format === 'csv') {
    const flat = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c]])));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${resource}-${stamp}.csv"`);
    return res.send(toCsv(flat, columns));
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${resource}-${stamp}.json"`);
  res.send(JSON.stringify(rows, null, 2));
}));

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

server.listen(PORT, () => {
  console.log(`🚀 Server        http://localhost:${PORT}`);
  console.log(`🔌 WebSocket     ws://localhost:${PORT}/ws`);
  console.log(`✅ Health        http://localhost:${PORT}/api/health`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received, closing…`);
  server.close();
  for (const c of wss.clients) c.terminate();
  await store.close().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
