import { ensureSchema, json } from "./_lib";

// 诊断页：浏览器直接访问 https://你的域名/api/health 查看数据库连接状态
export const onRequestGet = async (context: any) => {
  const out: any = {
    dbBound: !!context.env?.DB,
    time: new Date().toISOString(),
  };
  if (!context.env?.DB) {
    out.ok = false;
    out.message = "未检测到 D1 绑定。请到 Pages 项目「设置 → 函数 → D1 数据库绑定」添加，变量名填 DB，然后重新部署。";
    return json(out);
  }
  try {
    await ensureSchema(context.env);
    const row: any = await context.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'`
    ).first();
    out.ok = true;
    out.tables = row.n;
    out.message = "数据库连接正常，可正常注册。";
  } catch (e: any) {
    out.ok = false;
    out.message = `数据库有绑定但初始化失败：${e?.message || e}`;
  }
  return json(out);
};
