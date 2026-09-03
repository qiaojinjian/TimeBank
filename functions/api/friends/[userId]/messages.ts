import { requireAuth, apiError, json, fail, uid, isFriend } from '../../_lib';

// 好友留言：只限好友之间
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, params } = await requireAuth(context);
    if (user.role !== 'child') return json({ messages: [] });
    const peer: any = await env.DB.prepare(`SELECT id, name, avatar FROM users WHERE id=? AND role='child'`)
      .bind(params.userId).first();
    if (!peer) return fail('没有找到这个小朋友', 404);
    if (!(await isFriend(env, user.id, peer.id))) return fail('你们还不是好友', 403);

    const res: any = await env.DB.prepare(
      `SELECT id, from_user, body, created_at FROM friend_messages
       WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)
       ORDER BY created_at DESC LIMIT 50`
    ).bind(user.id, peer.id, peer.id, user.id).all();
    return json({ peer, messages: (res.results as any[]).reverse() });
  } catch (e: any) {
    return apiError(e);
  }
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, params, body } = await requireAuth(context);
    if (user.role !== 'child') return fail('只有小朋友能留言', 403);
    if (!(await isFriend(env, user.id, params.userId))) return fail('你们还不是好友', 403);
    const text = String(body.body || '').trim().slice(0, 60);
    if (!text) return fail('写点什么再发送吧');
    await env.DB.prepare(
      `INSERT INTO friend_messages(id, from_user, to_user, body) VALUES(?,?,?,?)`
    ).bind(uid(), user.id, params.userId, text).run();
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
