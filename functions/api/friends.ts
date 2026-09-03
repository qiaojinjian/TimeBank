import { requireAuth, apiError, json, features } from './_lib';

// 好友主页：好友列表、好友申请、礼物记录
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    const feat = await features(env, family.id);
    if (user.role !== 'child' || !feat.allowFriends) {
      return json({ enabled: false, handle: user.handle, giftMax: feat.giftMax, friends: [], incoming: [], outgoing: [], gifts: [] });
    }

    const incoming: any = await env.DB.prepare(
      `SELECT l.id, l.message, l.created_at,
              u.id AS u_id, u.name AS u_name, u.avatar AS u_avatar, u.handle AS u_handle
       FROM friend_links l JOIN users u ON u.id = l.user_id
       WHERE l.friend_id=? AND l.status='pending'`
    ).bind(user.id).all();

    const outgoing: any = await env.DB.prepare(
      `SELECT l.id, l.created_at,
              u.id AS u_id, u.name AS u_name, u.avatar AS u_avatar, u.handle AS u_handle
       FROM friend_links l JOIN users u ON u.id = l.friend_id
       WHERE l.user_id=? AND l.status='pending'`
    ).bind(user.id).all();

    const accepted: any = await env.DB.prepare(
      `SELECT u.id AS u_id, u.name AS u_name, u.avatar AS u_avatar, u.handle AS u_handle
       FROM friend_links l JOIN users u ON u.id = (CASE WHEN l.user_id=? THEN l.friend_id ELSE l.user_id END)
       WHERE l.status='accepted' AND (l.user_id=? OR l.friend_id=?)`
    ).bind(user.id, user.id, user.id).all();

    const giftsRes: any = await env.DB.prepare(
      `SELECT g.id, g.coins, g.message, g.status, g.created_at,
              CASE WHEN g.from_user=? THEN 'out' ELSE 'in' END AS dir,
              u.name AS peer_name, u.avatar AS peer_avatar
       FROM gifts g JOIN users u ON u.id = (CASE WHEN g.from_user=? THEN g.to_user ELSE g.from_user END)
       WHERE g.from_user=? OR g.to_user=? ORDER BY g.created_at DESC LIMIT 20`
    ).bind(user.id, user.id, user.id, user.id).all();

    return json({
      enabled: true,
      giftMax: feat.giftMax,
      handle: user.handle,
      incoming: (incoming.results as any[]).map((r) => ({
        linkId: r.id, id: r.u_id, name: r.u_name, avatar: r.u_avatar, handle: r.u_handle,
        message: r.message, createdAt: r.created_at,
      })),
      outgoing: (outgoing.results as any[]).map((r) => ({
        linkId: r.id, id: r.u_id, name: r.u_name, avatar: r.u_avatar, handle: r.u_handle,
        createdAt: r.created_at,
      })),
      friends: (accepted.results as any[]).map((r) => ({
        id: r.u_id, name: r.u_name, avatar: r.u_avatar, handle: r.u_handle,
      })),
      gifts: giftsRes.results,
    });
  } catch (e: any) {
    return apiError(e);
  }
};
