import { requireAuth, apiError, json, fail } from '../_lib';

// 家长视角：每个孩子的好友列表
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== 'parent') return fail('只有家长能查看', 403);
    const kids: any = await env.DB.prepare(
      `SELECT id, name, avatar, handle FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
    ).bind(family.id).all();

    const out = [];
    for (const k of kids.results as any[]) {
      const res: any = await env.DB.prepare(
        `SELECT u.id, u.name, u.avatar, u.handle
         FROM friend_links l JOIN users u ON u.id = (CASE WHEN l.user_id=? THEN l.friend_id ELSE l.user_id END)
         WHERE l.status='accepted' AND (l.user_id=? OR l.friend_id=?)`
      ).bind(k.id, k.id, k.id).all();
      out.push({ ...k, friends: res.results });
    }
    return json({ kids: out });
  } catch (e: any) {
    return apiError(e);
  }
};
