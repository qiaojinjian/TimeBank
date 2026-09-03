// 账本类型 → 显示文案/图标
export const LEDGER_META: Record<string, { label: string; icon: string }> = {
  task: { label: "完成任务", icon: "🧾" },
  deposit_back: { label: "定期到期·本金", icon: "🏦" },
  interest: { label: "定期利息", icon: "💰" },
  goal: { label: "存入存钱罐", icon: "🎯" },
  deposit: { label: "存入定期", icon: "🏦" },
  redeem: { label: "兑换奖励", icon: "🎁" },
  cashout: { label: "兑换零花钱", icon: "💵" },
  refund: { label: "退回时币", icon: "↩️" },
  parent_adjust: { label: "家长加币", icon: "🖐️" },
  parent_deduct: { label: "家长扣币", icon: "🧾" },
  lottery_win: { label: "抽中时币", icon: "🎉" },
  lottery_buy: { label: "买抽奖机会", icon: "🎟️" },
  gift_sent: { label: "送给好友", icon: "🎈" },
  gift_received: { label: "好友赠送", icon: "💝" },
};

export function fmtLedger(kind: string) {
  return LEDGER_META[kind] || { label: kind, icon: "•" };
}

export function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `今天 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function fmtMoneyFen(fen: number) {
  const yuan = fen / 100;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
}

export function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function remainingDays(endAt: string) {
  const ms = new Date(endAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
}

export const AVATARS = ["😀", "😎", "🤓", "🥳", "🐱", "🐶", "🦊", "🐼", "🦄", "🐸", "🦁", "🐯", "🚀", "⚽", "🎧", "🌈"];

export const TASK_ICONS = ["⭐", "📚", "🧹", "🛏️", "🎹", "🏃", "🥦", "🦷", "💪", "🌅", "📝", "👟", "🧺", "🎨", "💧", "⏰"];

export const REWARD_ICONS = ["🎁", "📱", "🍦", "🎮", "🧸", "🏞️", "🎬", "🍿", "🚲", "⚽", "🎡", "🍕"];
