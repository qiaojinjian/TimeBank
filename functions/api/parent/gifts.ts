import { requireAuth, apiError, json, fail } from '../_lib';

// 别人送给自家孩子的时币
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== 'parent') return fail('只有家长能查看', 403);
    const res: any = await env.DB.prepare(
      `SELECT g.id, g.coins, g.message, g.status, g.created_at,
              fu.name AS from_name, fu.avatar AS from_avatar,
              tu.name AS to_name, tu.avatar AS to_avatar
       FROM gifts g
       JOIN users fu ON fu.id = g.from_user
       JOIN users tu ON tu.id = g.to_user
       WHERE g.to_user IN (SELECT id FROM users WHERE family_id=? AND role='child')
       ORDER BY g.created_at DESC LIMIT 50`
    ).bind(family.id).all();
    return json({ gifts: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};
