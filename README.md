# 🏦 儿童时间银行

面向 9~12 岁孩子的家庭亲子理财养成工具（Web · 手机友好）。
做任务赚「时币」→ 存定期吃利息 / 攒存钱罐 → 兑换奖励或真实零花钱，顺带学点财商。

## 快速开始

- 部署：见 **[DEPLOY.md](DEPLOY.md)**（免费 Cloudflare 全家桶，免备案，国内可访问）
- 本地开发：`npm install` → `npm run build` → `npx wrangler pages dev`

## 角色

- **家长**：注册家庭 → 发任务、上架奖励、审批打卡与兑换、设置利率和零花钱兑换比例
- **小朋友**：家庭码 + 密码登录 → 打卡、存钱、兑换

## 目录

```
functions/api/   后端接口（Cloudflare Pages Functions + D1）
src/pages/child  孩子端：大厅/任务/银行/商店/我的
src/pages/parent 家长端：概览/审批/任务/奖励/设置
```
