import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { Link } from "react-router-dom";
import { Empty, Sheet, useToast } from "../../lib/ui";
import { IfIcon } from "../../lib/Icon";

interface Overview {
  code: string;
  kids: { id: string; name: string; avatar: string; balance: number }[];
  pending: { completions: number; redemptions: number; gifts: number; total: number };
}

export default function Dashboard() {
  const toast = useToast();
  const [ov, setOv] = useState<Overview | null>(null);
  const [report, setReport] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [coinKid, setCoinKid] = useState<any>(null);
  const [coinMode, setCoinMode] = useState<"add" | "sub">("add");
  const [coinAmount, setCoinAmount] = useState(0);
  const [coinNote, setCoinNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setOv(await get<Overview>("/api/parent/overview"));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    get<any>("/api/parent/report").then(setReport).catch(() => {});
  }, []);

  const openCoins = (k: any) => {
    setCoinKid(k);
    setCoinMode("add");
    setCoinAmount(0);
    setCoinNote("");
  };

  const submitCoins = async () => {
    if (!coinKid || !coinAmount) return toast("先填一个数量");
    setBusy(true);
    try {
      const signed = coinMode === "add" ? coinAmount : -coinAmount;
      await post(`/api/parent/kids/${coinKid.id}/coins`, { amount: signed, note: coinNote });
      toast(`${coinMode === "add" ? "已加上" : "已扣除"} ${coinAmount} 时币`);
      setCoinKid(null);
      await Promise.all([load(), get<any>("/api/parent/report").then(setReport)]);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ov) return <div className="py-20 text-center text-slate-300 text-3xl">⏳</div>;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(ov.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      {/* 家庭码 */}
      <div className="bg-gradient-to-r from-indigo-500 to-sky-500 rounded-2xl text-white p-4 mb-4 shadow-lg shadow-indigo-200/60">
        <div className="text-indigo-100 text-xs mb-1">小朋友登录用的家庭码</div>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-black tracking-[0.25em]">{ov.code}</div>
          <button onClick={copyCode} className="bg-white/25 rounded-full px-4 py-2 text-sm font-bold">
            {copied ? "已复制 ✓" : "复制"}
          </button>
        </div>
      </div>

      {/* 待办审批入口 */}
      <Link to="/parent/approvals" className="block card mb-4 hover:border-sky-300 transition">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
            <IfIcon name="check" />
            待处理
          </span>
          {ov.pending.total > 0 ? (
            <span className="text-rose-500 font-black text-lg">
              打卡 {ov.pending.completions} · 兑换 {ov.pending.redemptions}
              {ov.pending.gifts > 0 && ` · 赠送 ${ov.pending.gifts}`}
            </span>
          ) : (
            <span className="text-emerald-500 font-bold text-sm">全部处理完啦 🎉</span>
          )}
        </div>
      </Link>

      {/* 孩子卡片 */}
      <h3 className="font-extrabold text-slate-600 mb-2 flex items-center gap-1.5">
        <IfIcon name="baby" />
        孩子们
      </h3>
      {ov.kids.length === 0 ? (
        <Link to="/parent/settings" className="card block text-center py-8 text-slate-400 hover:border-sky-300">
          <div className="text-4xl mb-1">🧒</div>
          <div className="text-sm">还没有添加小朋友，去设置里添加</div>
          <div className="text-sky-500 font-bold text-sm mt-1">去添加 →</div>
        </Link>
      ) : (
        <div className="space-y-3 mb-4">
          {ov.kids.map((k) => {
            const rk = report?.kids?.find((x: any) => x.id === k.id);
            return (
              <div key={k.id} className="card flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-2xl shrink-0">
                  {k.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold">{k.name}</div>
                  <div className="text-xs text-slate-400">
                    {rk ? `近 7 天完成 ${rk.weekCompletions} 次 · +${rk.weekCoins} 时币` : "本周还没有记录"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-amber-600">🪙 {k.balance.toLocaleString()}</div>
                  <button
                    onClick={() => openCoins(k)}
                    className="mt-1 text-xs font-bold text-sky-600 bg-sky-50 rounded-full px-2.5 py-1"
                  >
                    🪙 加币
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 本周表现 */}
      {report && report.kids.some((k: any) => k.goals.length > 0 || k.weekCompletions > 0) && (
        <>
          <h3 className="font-extrabold text-slate-600 mb-2 flex items-center gap-1.5">
            <IfIcon name="barchart" />
            本周表现
          </h3>
          <div className="card mb-4">
            {report.kids.map((k: any) =>
              k.goals.length === 0 && k.weekCompletions === 0 ? null : (
                <div key={k.id} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="font-bold text-sm mb-1">
                    {k.avatar} {k.name}
                    {k.weekCompletions > 0 && (
                      <span className="text-xs text-slate-400 font-normal ml-2">
                        完成 {k.weekCompletions} 次 · 得 {k.weekCoins} 时币
                      </span>
                    )}
                  </div>
                  {k.goals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {k.goals.map((g: any) => (
                        <span key={g.id} className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                          {g.icon} {g.title} {g.saved}/{g.target}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* 家庭总币量 */}
      <div className="text-center text-xs text-slate-300 pb-2">
        全家庭共存了 {report?.totalCoins?.toLocaleString() ?? 0} 时币 · 孩子们都很棒！
      </div>

      {/* 手动加币 */}
      <Sheet open={!!coinKid} onClose={() => setCoinKid(null)} title={`🪙 调整 ${coinKid?.name || ""} 的时币`}>
        <div className="text-center text-sm text-slate-500 mb-3">
          当前余额 <b className="text-amber-600">{coinKid?.balance ?? 0}</b> 时币
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setCoinMode("add")}
            className={`btn py-2.5 ${coinMode === "add" ? "btn-primary" : "btn-soft"}`}
          >
            ➕ 加币
          </button>
          <button
            onClick={() => setCoinMode("sub")}
            className={`btn py-2.5 ${coinMode === "sub" ? "btn-danger" : "btn-soft"}`}
          >
            ➖ 扣币
          </button>
        </div>

        <div className="flex gap-3 items-stretch">
          <input
            className="input flex-1 text-3xl font-black text-center"
            type="number"
            inputMode="numeric"
            value={coinAmount || ""}
            placeholder="0"
            onChange={(e) => setCoinAmount(Math.min(999, parseInt(e.target.value, 10) || 0))}
          />
          <div className="grid grid-rows-3 gap-1.5 w-20 shrink-0">
            {[1, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setCoinAmount((v) => Math.min(999, v + n))}
                className="btn btn-gold text-sm"
              >
                +{n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[0.7rem] text-slate-400 mt-2">快捷按钮是累加，点一次 +5 再加一次 +10 就是 15</p>

        <div className="mt-4">
          <label className="field-label">备注（会记进他的账本）</label>
          <input
            className="input"
            value={coinNote}
            maxLength={40}
            placeholder={"比如：帮忙拿快递奖励"}
            onChange={(e) => setCoinNote(e.target.value)}
          />
        </div>

        <button
          onClick={submitCoins}
          disabled={busy || !coinAmount}
          className="btn btn-primary w-full py-3.5 text-lg mt-4"
        >
          {coinMode === "add" ? `加上 ${coinAmount} 时币` : `扣除 ${coinAmount} 时币`}
        </button>
      </Sheet>
    </div>
  );
}
