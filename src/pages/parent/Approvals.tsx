import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { useToast, Empty } from "../../lib/ui";
import { fmtDate, fmtMoneyFen } from "../../lib/format";
import { IfIcon } from "../../lib/Icon";

type Tab = "completions" | "redemptions" | "gifts";

export default function Approvals() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("completions");
  const [comps, setComps] = useState<any[]>([]);
  const [reds, setReds] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, r, g] = await Promise.all([
        get("/api/parent/completions?status=pending"),
        get("/api/parent/redemptions?status=pending"),
        get("/api/parent/gifts"),
      ]);
      setComps(c.completions || []);
      setReds(r.redemptions || []);
      setGifts((g.gifts || []).filter((x: any) => x.status === "pending"));
    } catch (e: any) {
      toast(e.message);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const act = async (kind: "completions" | "redemptions" | "gifts", id: string, action: string, msg: string) => {
    setBusy(`${kind}-${id}`);
    try {
      await post(`/api/parent/${kind}/${id}`, { action });
      toast(msg);
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(null);
    }
  };

  const list = tab === "completions" ? comps : tab === "redemptions" ? reds : gifts;
  const count = (arr: any[]) => arr.filter((x) => x.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
          <IfIcon name="check" />
          审批
        </h2>
        <button onClick={load} className="btn btn-soft text-sm px-4 py-1.5">刷新</button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setTab("completions")}
          className={`btn py-2.5 text-sm ${tab === "completions" ? "btn-primary" : "btn-soft"}`}
        >
          打卡 {count(comps) > 0 && `(${count(comps)})`}
        </button>
        <button
          onClick={() => setTab("redemptions")}
          className={`btn py-2.5 text-sm ${tab === "redemptions" ? "btn-gold" : "btn-soft"}`}
        >
          兑换 {count(reds) > 0 && `(${count(reds)})`}
        </button>
        <button
          onClick={() => setTab("gifts")}
          className={`btn py-2.5 text-sm ${tab === "gifts" ? "btn-green" : "btn-soft"}`}
        >
          赠送 {count(gifts) > 0 && `(${count(gifts)})`}
        </button>
      </div>

      {tab === "completions" ? (
        list.length === 0 ? (
          <Empty text="没有待审批的打卡" emoji="✅" />
        ) : (
          <div className="space-y-3">
            {list.map((c: any) => (
              <div key={c.id} className="card">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.child_avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm">
                      {c.task_icon} {c.task_title}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.child_name} 在 {fmtDate(c.created_at)} 说做完了
                    </div>
                  </div>
                  <div className="coin text-lg shrink-0">+{c.amount}</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={busy === `completions-${c.id}`}
                    onClick={() => act("completions", c.id, "approve", `已通过，+${c.amount} 时币到账`)}
                    className="btn btn-green flex-1 py-2.5 text-sm"
                  >
                    ✓ 确认完成，发时币
                  </button>
                  <button
                    disabled={busy === `completions-${c.id}`}
                    onClick={() => act("completions", c.id, "reject", "已标记未通过")}
                    className="btn btn-soft px-4 text-sm"
                  >
                    不通过
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "gifts" ? (
        list.length === 0 ? (
          <Empty text="没有待审批的赠送" emoji="💝" />
        ) : (
          <div className="space-y-3">
            {list.map((g: any) => (
              <div key={g.id} className="card">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.from_avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm">
                      {g.from_name} 送给 {g.to_name} <span className="coin">{g.coins} 时币</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {g.message || "没有留言"} · {fmtDate(g.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-sky-600 bg-sky-50 rounded-lg px-2.5 py-1.5 mt-2">
                  👉 通过就会进 {g.to_name} 的钱包；退回则还给 {g.from_name}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={busy === `gifts-${g.id}`}
                    onClick={() => act("gifts", g.id, "approve", "已通过，时币到账")}
                    className="btn btn-green flex-1 py-2.5 text-sm"
                  >
                    ✓ 同意收下
                  </button>
                  <button
                    disabled={busy === `gifts-${g.id}`}
                    onClick={() => act("gifts", g.id, "reject", "已退回对方")}
                    className="btn btn-danger px-4 text-sm"
                  >
                    退回
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : list.length === 0 ? (
        <Empty text="没有待审批的兑换申请" emoji="🛍️" />
      ) : (
        <div className="space-y-3">
          {list.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{r.child_avatar}</span>
                <div className="flex-1 min-w-0">
                  {r.kind === "cashout" ? (
                    <>
                      <div className="font-extrabold text-sm">💵 零花钱兑换</div>
                      <div className="text-xs text-slate-400">
                        {r.child_name} 要用 {r.coins} 时币换 {fmtMoneyFen(r.money_fen)} 元
                      </div>
                    </>
                  ) : r.kind === "lottery" ? (
                    <>
                      <div className="font-extrabold text-sm">🎉 抽奖奖品：{r.note}</div>
                      <div className="text-xs text-slate-400">
                        {r.child_name} 在 {fmtDate(r.created_at)} 抽中并申请兑现
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-extrabold text-sm">
                        {r.reward_icon} 奖励：{r.reward_title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {r.child_name} · {fmtDate(r.created_at)}
                      </div>
                    </>
                  )}
                </div>
                {r.coins > 0 && <div className="coin text-base shrink-0">-{r.coins}</div>}
              </div>
              <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
                👉 {r.kind === "cashout"
                  ? "确认已把零花钱亲手交给孩子后点通过"
                  : r.kind === "lottery"
                  ? "确认已把抽中的奖品兑现给孩子后点通过"
                  : "确认已兑现这个奖励后点通过"}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  disabled={busy === `redemptions-${r.id}`}
                  onClick={() => act("redemptions", r.id, "approve", "已通过，记得兑现哦")}
                  className="btn btn-gold flex-1 py-2.5 text-sm"
                >
                  ✓ 确认兑现
                </button>
                <button
                  disabled={busy === `redemptions-${r.id}`}
                  onClick={() => act("redemptions", r.id, "reject", "已拒绝，时币已退回孩子")}
                  className="btn btn-danger px-4 text-sm"
                >
                  拒绝并退回
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
