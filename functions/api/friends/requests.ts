import { requireAuth, apiError, json, fail, uid, normalizeHandle, features } from '../_lib';

// 发送好友申请
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== 'child') return fail('只有小朋友能加好友', 403);
    const feat = await features(env, family.id);
    if (!feat.allowFriends) return fail('家长还没有开放好友功能');

    const handle = normalizeHandle(body.handle);
    if (!handle) return fail('先填一个宝贝号');
    const target: any = await env.DB.prepare(
      `SELECT id FROM users WHERE handle=? AND role='child'`
    ).bind(handle).first();
    if (!target) return fail('没有找到这个宝贝号，检查一下有没有输错');
    if (target.id === user.id) return fail('这是你自己的宝贝号呀');

    const dupe: any = await env.DB.prepare(
      `SELECT id, status FROM friend_links WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)`
    ).bind(user.id, target.id, target.id, user.id).first();
    if (dupe) return fail(dupe.status === 'accepted' ? '你们已经是好友啦' : '已经发过申请了，等对方同意吧');

    const message = String(body.message || '').trim().slice(0, 30) || null;
    await env.DB.prepare(
      `INSERT INTO friend_links(id, user_id, friend_id, status, message) VALUES(?,?,?,?,?)`
    ).bind(uid(), user.id, target.id, 'pending', message).run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
