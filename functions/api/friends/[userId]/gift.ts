import { requireAuth, apiError, json, fail, uid, debit, isFriend, features } from '../../_lib';

// 给好友赠送时币：先冻结，对方家长审批后到账
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== 'child') return fail('只有小朋友能赠送时币', 403);
    const feat = await features(env, family.id);
    if (!feat.allowFriends) return fail('家长还没有开放好友功能');
    if (!(await isFriend(env, user.id, params.userId))) return fail('你们还不是好友', 403);

    const peer: any = await env.DB.prepare(`SELECT id, name FROM users WHERE id=? AND role='child'`)
      .bind(params.userId).first();
    if (!peer) return fail('没有找到这个小朋友', 404);

    const coins = Math.floor(Number(body.coins));
    if (!Number.isFinite(coins) || coins < 1) return fail('至少要送 1 时币');
    if (coins > feat.giftMax) return fail('家长设置了一次最多送 ' + feat.giftMax + ' 时币');

    const message = String(body.message || '').trim().slice(0, 30) || null;
    await debit(env, user.id, coins, 'gift_sent', '送给 ' + peer.name);
    await env.DB.prepare(
      `INSERT INTO gifts(id, from_user, to_user, coins, message, status) VALUES(?,?,?,?,?,?)`
    ).bind(uid(), user.id, peer.id, coins, message, 'pending').run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
