import { requireAuth, apiError, json, fail, normalizeHandle } from '../_lib';

// 设置 / 修改宝贝号（好友之间靠它互相查找）
export const onRequestPut = async (context: any) => {
  try {
    const { env, user, body } = await requireAuth(context);
    if (user.role !== 'child') return fail('只有小朋友有宝贝号', 403);

    const handle = normalizeHandle(body.handle);
    if (!/^[A-Z0-9_]{4,16}$/.test(handle)) return fail('宝贝号要 4~16 位，只能用字母、数字和下划线');

    const exists: any = await env.DB.prepare('SELECT id FROM users WHERE handle=? AND id<>?')
      .bind(handle, user.id).first();
    if (exists) return fail('这个宝贝号已经被别人用啦，换一个试试');

    await env.DB.prepare('UPDATE users SET handle=? WHERE id=?').bind(handle, user.id).run();
    return json({ ok: true, handle });
  } catch (e: any) {
    return apiError(e);
  }
};
