import { requireAuth, apiError, json, fail, normalizeHandle, isFriend, features } from '../_lib';

// 按宝贝号查找其他小朋友
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== 'child') return json({ kids: [] });
    const feat = await features(env, family.id);
    if (!feat.allowFriends) return json({ kids: [] });
    const url = new URL(context.request.url);
    const q = normalizeHandle(url.searchParams.get('q') || '');
    if (q.length < 3) return json({ kids: [] });

    const res: any = await env.DB.prepare(
      `SELECT id, name, avatar, handle FROM users
       WHERE role='child' AND handle IS NOT NULL AND handle LIKE ? AND id<>? LIMIT 10`
    ).bind(`${q}%`, user.id).all();

    const out = [];
    for (const k of res.results as any[]) {
      const pending: any = await env.DB.prepare(
        `SELECT id, user_id FROM friend_links WHERE status='pending'
         AND ((user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?))`
      ).bind(user.id, k.id, k.id, user.id).first();
      out.push({
        ...k,
        relation: pending
          ? pending.user_id === user.id ? 'outgoing' : 'incoming'
          : (await isFriend(env, user.id, k.id)) ? 'friend' : 'none',
      });
    }
    return json({ kids: out });
  } catch (e: any) {
    return apiError(e);
  }
};
