import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { useHome } from "./ChildApp";
import { Sheet, useToast } from "../../lib/ui";
import { fmtDate } from "../../lib/format";

interface Lottery {
  enabled: number;
  quota: { free: number; earned: number; bought: number; used: number; left: number; canBuy: number; price: number } | null;
  prizes: { id: string; title: string; icon: string; kind: string; coins: number; weight: number; pct: number }[];
  draws: any[];
}

export default function LotteryPanel() {
  const toast = useToast();
  const { reload } = useHome();
  const [data, setData] = useState<Lottery | null>(null);
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setData(await get<Lottery>("/api/lottery"));
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (!data || !data.enabled) return null;
  const quota = data.quota;

  const draw = async () => {
    if (spinning || busy) return;
    setResult(null);
    setSpinning(true);
    try {
      const r = await post<{ prize: any; quota: any }>("/api/lottery/draw");
      // 让转盘转够 1 秒再揭晓
      await new Promise((res) => setTimeout(res, 900));
      setResult(r.prize);
      setData((d) => (d ? { ...d, quota: r.quota } : d));
      await load();
      await reload();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSpinning(false);
    }
  };

  const buy = async () => {
    setBusy(true);
    try {
      const r = await post<{ cost: number; quota: any }>("/api/lottery/buy", { count: 1 });
      toast(`买到 1 次机会，花了 ${r.cost} 时币`);
      setData((d) => (d ? { ...d, quota: r.quota } : d));
      await Promise.all([load(), reload()]);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: "claim" | "skip") => {
    setBusy(true);
    try {
      await post(`/api/lottery/draws/${id}`, { action });
      toast(action === "claim" ? "已申请兑现，等家长确认" : "好的，先收着");
      setResult(null);
      await Promise.all([load(), reload()]);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 rounded-2xl p-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200/70 text-left flex items-center justify-between"
      >
        <div>
          <div className="font-black text-lg">🎰 抽奖转盘</div>
          <div className="text-violet-100 text-sm mt-0.5">
            {quota && quota.left > 0 ? `今天还能抽 ${quota.left} 次` : "今天的次数用完啦"}
          </div>
        </div>
        <span className="bg-white/25 rounded-full px-4 py-2 text-sm font-bold">去抽奖 →</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="🎰 抽奖转盘">
        {/* 机会 */}
        <div className="rounded-xl bg-violet-50 text-violet-800 p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">今天还能抽</span>
            <span className="font-black text-2xl">{quota?.left ?? 0} 次</span>
          </div>
          <div className="text-xs mt-1 text-violet-600">
            免费 {quota?.free ?? 0} · 做任务送 {quota?.earned ?? 0} · 已买 {quota?.bought ?? 0} · 已抽 {quota?.used ?? 0}
          </div>
        </div>

        {/* 转盘 */}
        <div className="text-center py-2">
          <div className={`text-7xl inline-block ${spinning ? "spin-fast" : ""}`}>
            {result ? result.icon : spinning ? "🎰" : "🎡"}
          </div>
          {result && (
            <div className="mt-2">
              <div className="font-black text-lg">
                {result.kind === "none" ? "谢谢参与！" : `恭喜抽中「${result.title}」`}
              </div>
              {result.kind === "coins" && (
                <div className="text-amber-600 font-bold">{result.coins} 时币已经进钱包啦</div>
              )}
              {result.kind === "gift" && (
                <div className="text-slate-500 text-sm mt-1">要不要现在找家长兑现？</div>
              )}
            </div>
          )}
        </div>

        {result && result.kind === "gift" && result.status === "pending" ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button disabled={busy} onClick={() => act(result.id, "claim")} className="btn btn-green py-3">
              我要兑现
            </button>
            <button disabled={busy} onClick={() => setResult(null)} className="btn btn-soft py-3">
              先不要
            </button>
          </div>
        ) : (
          <button
            onClick={draw}
            disabled={spinning || busy || !quota || quota.left <= 0}
            className="btn btn-primary w-full py-3.5 text-lg mb-3"
          >
            {spinning ? "转啊转…" : quota && quota.left > 0 ? "开始抽奖" : "今天没有机会了"}
          </button>
        )}

        {/* 买机会 */}
        {(quota?.canBuy ?? 0) > 0 && quota && quota.price > 0 && (
          <button onClick={buy} disabled={busy} className="btn btn-gold w-full py-2.5 mb-3 text-sm">
            花 {quota.price} 时币再买 1 次（今天还能买 {quota.canBuy} 次）
          </button>
        )}

        {/* 概率 */}
        {data.prizes.length > 0 && (
          <div className="card !p-3 mb-3">
            <div className="font-extrabold text-sm text-slate-600 mb-2">🏆 奖项一览</div>
            {data.prizes.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm py-1">
                <span className="text-lg">{p.icon}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-xs text-slate-400">
                  {p.kind === "coins" ? `${p.coins} 时币` : p.kind === "gift" ? "礼物" : "空奖"}
                </span>
                <span className="font-black text-amber-600 w-12 text-right">{p.pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* 我的奖品 */}
        {data.draws.length > 0 && (
          <div className="card !p-3">
            <div className="font-extrabold text-sm text-slate-600 mb-2">🎁 我的奖品</div>
            {data.draws.slice(0, 8).map((d: any) => (
              <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-lg">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{d.title}</div>
                  <div className="text-[0.65rem] text-slate-400">{fmtDate(d.created_at)}</div>
                </div>
                {d.kind === "coins" && <span className="text-amber-600 text-sm font-bold">+{d.coins}</span>}
                {d.status === "pending" && (
                  <span className="text-[0.65rem] text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">待决定</span>
                )}
                {d.status === "claimed" && (
                  <span className="text-[0.65rem] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">等家长兑现</span>
                )}
                {d.status === "skipped" && (
                  <span className="text-[0.65rem] text-slate-400 bg-slate-50 rounded-full px-2 py-0.5">未兑现</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
