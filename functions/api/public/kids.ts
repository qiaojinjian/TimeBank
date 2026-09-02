import { ensureSchema, json } from "../_lib";

// 孩子登录前：根据家庭码列出小朋友（只含名字/头像，无隐私数据）
export const onRequestGet = async (context: any) => {
  await ensureSchema(context.env);
  const url = new URL(context.request.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  if (!code) return json({ kids: [] });
  const family: any = await context.env.DB.prepare(
    `SELECT id, name FROM families WHERE code=?`
  ).bind(code).first();
  if (!family) return json({ kids: [], familyName: "" });
  const res: any = await context.env.DB.prepare(
    `SELECT id, name, avatar FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
  ).bind(family.id).all();
  return json({ kids: res.results, familyName: family.name });
};
