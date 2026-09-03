import { requireAuth, apiError, json, fail } from '../../../_lib';

// 家长删除孩子的好友
export const onRequestDelete = async (context: any) => {
  try {
    const { env, user, family, params } = await requireAuth(context);
    if (user.role !== 'parent') return fail('只有家长能删除', 403);
    const kid: any = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND family_id=? AND role='child'`)
      .bind(params.kidId, family.id).first();
    if (!kid) return fail('没找到这个小朋友', 404);
    await env.DB.prepare(
      `DELETE FROM friend_links WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)`
    ).bind(params.kidId, params.friendId, params.friendId, params.kidId).run();
    await env.DB.prepare(
      `DELETE FROM friend_messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)`
    ).bind(params.kidId, params.friendId, params.friendId, params.kidId).run();
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
