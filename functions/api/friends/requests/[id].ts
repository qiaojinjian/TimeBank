import { requireAuth, apiError, json, fail } from '../../_lib';

// 接受 / 拒绝好友申请（只有收到申请的一方可以操作）
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, params, body } = await requireAuth(context);
    if (user.role !== 'child') return fail('只有小朋友能处理好友申请', 403);
    const link: any = await env.DB.prepare(
      `SELECT * FROM friend_links WHERE id=? AND friend_id=? AND status='pending'`
    ).bind(params.id, user.id).first();
    if (!link) return fail('没有找到这条申请', 404);

    if (body.action === 'accept') {
      await env.DB.prepare(`UPDATE friend_links SET status='accepted' WHERE id=?`).bind(link.id).run();
    } else {
      await env.DB.prepare(`DELETE FROM friend_links WHERE id=?`).bind(link.id).run();
    }
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
