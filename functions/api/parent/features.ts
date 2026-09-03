import { requireAuth, apiError, json, fail, features } from '../_lib';

// 好友功能开关与赠送上限
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== 'parent') return fail('只有家长能查看', 403);
    return json({ features: await features(env, family.id) });
  } catch (e: any) {
    return apiError(e);
  }
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== 'parent') return fail('只有家长能修改', 403);
    const allowFriends = body.allowFriends === false || body.allowFriends === 0 ? 0 : 1;
    const giftMax = Math.min(500, Math.max(1, Math.floor(Number(body.giftMax) || 50)));
    await env.DB.prepare(
      `INSERT INTO family_features(family_id, allow_friends, gift_max) VALUES(?,?,?)
       ON CONFLICT(family_id) DO UPDATE SET allow_friends=excluded.allow_friends, gift_max=excluded.gift_max`
    ).bind(family.id, allowFriends, giftMax).run();
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
