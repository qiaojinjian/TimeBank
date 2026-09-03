import { requireAuth, apiError, json, fail, credit } from '../../_lib';

// 审批好友赠送：approve 到账 / reject 退回对方
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== 'parent') return fail('只有家长能审批', 403);
    const action = body.action === 'reject' ? 'reject' : 'approve';

    const gift: any = await env.DB.prepare(
      `SELECT g.*, fu.name AS from_name FROM gifts g JOIN users fu ON fu.id = g.from_user
       WHERE g.id=? AND g.to_user IN (SELECT id FROM users WHERE family_id=? AND role='child')`
    ).bind(params.id, family.id).first();
    if (!gift) return fail('没有找到这笔赠送', 404);
    if (gift.status !== 'pending') return fail('这笔已经处理过啦');

    if (action === 'approve') {
      await credit(env, gift.to_user, gift.coins, 'gift_received', gift.from_name + ' 送的');
    } else {
      await credit(env, gift.from_user, gift.coins, 'refund', '好友赠送被退回');
    }
    await env.DB.prepare(`UPDATE gifts SET status=?, reviewed_by=?, reviewed_at=? WHERE id=?`)
      .bind(action === 'approve' ? 'approved' : 'rejected', user.id, new Date().toISOString(), gift.id).run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
