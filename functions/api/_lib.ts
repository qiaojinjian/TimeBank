// 共享库：schema、认证、账本、工具
export const COOKIE = "tb_session";
const SESSION_DAYS = 30;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  exchange_rate INTEGER NOT NULL DEFAULT 10,
  interest_7 INTEGER NOT NULL DEFAULT 1,
  interest_14 INTEGER NOT NULL DEFAULT 2,
  interest_30 INTEGER NOT NULL DEFAULT 4,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('parent','child')),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '😀',
  email TEXT,
  secret_hash TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐',
  kind TEXT NOT NULL DEFAULT 'daily',
  amount INTEGER NOT NULL DEFAULT 1,
  approve TEXT NOT NULL DEFAULT 'manual',
  assignee TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  term_days INTEGER NOT NULL,
  rate INTEGER NOT NULL DEFAULT 0,
  interest INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  end_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  target INTEGER NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎁',
  price INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  reward_id TEXT,
  kind TEXT NOT NULL DEFAULT 'reward',
  coins INTEGER NOT NULL DEFAULT 0,
  money_fen INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL,
  note TEXT,
  balance_after INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completions_child ON completions(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_redemptions_family ON redemptions(family_id, status);
`;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function uid(): string {
  return crypto.randomUUID();
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function hashSecret(secret: string, saltBytes?: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const salt = saltBytes ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 60000, hash: "SHA-256" },
    key,
    256
  );
  const hex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `v1$${b64(salt)}$${hex}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  try {
    const [v, saltB64, hex] = stored.split("$");
    if (v !== "v1") return false;
    const salt = unb64(saltB64);
    const h = await hashSecret(secret, salt);
    return h === stored;
  } catch {
    return false;
  }
}

export function genCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  for (const b of rnd) s += alphabet[b % alphabet.length];
  return s;
}

export async function ensureSchema(env: any): Promise<void> {
  if (!env?.DB) {
    throw new HttpError(
      500,
      "数据库没连接上：请到 Cloudflare Pages 项目的「设置 → 函数 → D1 数据库绑定」添加绑定，变量名必须填 DB，然后重新部署"
    );
  }
  try {
    const row = await env.DB.prepare(`SELECT v FROM meta WHERE k='schema'`).first();
    if (row) return;
  } catch {
    /* meta 表还不存在，走初始化 */
  }
  // 首次部署时可能多个请求/多个 Worker 实例同时初始化，全部用幂等语句 + OR IGNORE，避免并发冲突
  for (const stmt of SCHEMA.split(";")) {
    const s = stmt.trim();
    if (!s) continue;
    await env.DB.prepare(s).run();
  }
  await env.DB.prepare(`INSERT OR IGNORE INTO meta(k,v) VALUES('schema','1')`).run();
}

// ---------------- 认证 ----------------

export interface AuthUser {
  id: string;
  familyId: string;
  role: "parent" | "child";
  token?: string;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setSessionCookie(res: Response, token: string): Response {
  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}; Secure`
  );
  return res;
}

export function clearSessionCookie(res: Response): Response {
  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}

export async function currentUser(env: any, request: Request): Promise<AuthUser | null> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE];
  if (!token) return null;
  const row: any = await env.DB.prepare(
    `SELECT s.token, s.expires_at, u.id, u.role, u.family_id
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
    return null;
  }
  return { id: row.id, familyId: row.family_id, role: row.role, token };
}

export async function createSession(env: any, userId: string): Promise<string> {
  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await env.DB.prepare(`INSERT INTO sessions(token, user_id, expires_at) VALUES(?,?,?)`)
    .bind(token, userId, expires)
    .run();
  return token;
}

// ---------------- 账本核心 ----------------

export async function credit(env: any, userId: string, amount: number, kind: string, note: string): Promise<void> {
  if (amount <= 0) return;
  await env.DB.prepare(`UPDATE users SET balance = balance + ? WHERE id = ?`).bind(amount, userId).run();
  const u: any = await env.DB.prepare(`SELECT balance FROM users WHERE id=?`).bind(userId).first();
  await env.DB.prepare(
    `INSERT INTO ledger(id,user_id,amount,kind,note,balance_after) VALUES(?,?,?,?,?,?)`
  ).bind(uid(), userId, amount, kind, note, u.balance).run();
}

export async function debit(env: any, userId: string, amount: number, kind: string, note: string): Promise<void> {
  const u: any = await env.DB.prepare(`SELECT balance FROM users WHERE id=?`).bind(userId).first();
  if (!u || u.balance < amount) throw new HttpError(400, "余额不足啦，先去做任务赚时币吧");
  await env.DB.prepare(`UPDATE users SET balance = balance - ? WHERE id = ?`).bind(amount, userId).run();
  const u2: any = await env.DB.prepare(`SELECT balance FROM users WHERE id=?`).bind(userId).first();
  await env.DB.prepare(
    `INSERT INTO ledger(id,user_id,amount,kind,note,balance_after) VALUES(?,?,?,?,?,?)`
  ).bind(uid(), userId, -amount, kind, note, u2.balance).run();
}

// 懒结算：检查该用户到期的定期存款，自动还本付息
export async function settleDeposits(env: any, userId: string): Promise<any[]> {
  const res: any = await env.DB.prepare(
    `SELECT * FROM deposits WHERE user_id=? AND status='active'`
  ).bind(userId).all();
  const now = Date.now();
  const matured = (res.results as any[]).filter((d) => new Date(d.end_at).getTime() <= now);
  for (const d of matured) {
    await credit(env, userId, d.amount, "deposit_back", `定期到期·本金`);
    if (d.interest > 0) await credit(env, userId, d.interest, "interest", `定期利息·${d.term_days}天`);
    await env.DB.prepare(`UPDATE deposits SET status='matured' WHERE id=?`).bind(d.id).run();
  }
  return matured;
}

// 定期利率（百分数）
export function rateForTerm(termDays: number, family: any): number {
  return termDays >= 30 ? family.interest_30 : termDays >= 14 ? family.interest_14 : family.interest_7;
}

// ---------------- 请求封装 ----------------

export interface Ctx {
  env: any;
  request: Request;
  params: Record<string, string>;
}

export async function bodyOf(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function requireAuth(context: any): Promise<{ env: any; user: any; family: any; params: any; body: any }> {
  const { env } = context;
  await ensureSchema(env);
  const auth = await currentUser(env, context.request);
  if (!auth) throw new HttpError(401, "请先登录");
  if (auth.role === "child") await settleDeposits(env, auth.id); // 先结算到期存款，保证余额准确
  const user: any = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(auth.id).first();
  if (!user) throw new HttpError(401, "账号不存在");
  const family: any = await env.DB.prepare(`SELECT * FROM families WHERE id=?`).bind(auth.familyId).first();
  return { env, user, family, params: context.params || {}, body: await bodyOf(context.request) };
}

export function apiError(e: any): Response {
  if (e instanceof HttpError) return fail(e.message, e.status);
  console.error(e);
  return fail("服务器开小差了，请稍后再试", 500);
}
