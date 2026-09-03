import { requireAuth, apiError, json, fail } from '../_lib';

// 删除好友（双向解除）
export const onRequestDelete = async (context: any) => {
  try {
    const { env, user, params } = await requireAuth(context);
    if (user.role !== 'child') return fail('只有小朋友能删除好友', 403);
    await env.DB.prepare(
      `DELETE FROM friend_links WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)`
    ).bind(user.id, params.userId, params.userId, user.id).run();
    await env.DB.prepare(
      `DELETE FROM friend_messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)`
    ).bind(user.id, params.userId, params.userId, user.id).run();
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
