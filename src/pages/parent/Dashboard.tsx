import { useEffect, useState } from "react";
import { get } from "../../lib/api";
import { Link } from "react-router-dom";
import { Empty } from "../../lib/ui";

interface Overview {
  code: string;
  kids: { id: string; name: string; avatar: string; balance: number }[];
  pending: { completions: number; redemptions: number; total: number };
}

export default function Dashboard() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [report, setReport] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    get<Overview>("/api/parent/overview").then(setOv).catch(() => {});
    get<any>("/api/parent/report").then(setReport).catch(() => {});
  }, []);

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
          <span className="font-extrabold text-slate-700">✅ 待处理</span>
          {ov.pending.total > 0 ? (
            <span className="text-rose-500 font-black text-lg">
              打卡 {ov.pending.completions} · 兑换 {ov.pending.redemptions}
            </span>
          ) : (
            <span className="text-emerald-500 font-bold text-sm">全部处理完啦 🎉</span>
          )}
        </div>
      </Link>

      {/* 孩子卡片 */}
      <h3 className="font-extrabold text-slate-600 mb-2">👧 孩子们</h3>
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
                  <div className="text-[0.65rem] text-slate-300">时币</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 本周表现 */}
      {report && report.kids.some((k: any) => k.goals.length > 0 || k.weekCompletions > 0) && (
        <>
          <h3 className="font-extrabold text-slate-600 mb-2">📈 本周表现</h3>
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
    </div>
  );
}
