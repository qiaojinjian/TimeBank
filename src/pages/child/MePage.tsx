import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useHome } from "./ChildApp";
import { useToast, Empty } from "../../lib/ui";
import { fmtDate, fmtLedger } from "../../lib/format";

export default function MePage() {
  const { user, family, logout } = useAuth();
  const { data, reload } = useHome();
  const toast = useToast();
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    get<{ ledger: any[] }>("/api/ledger")
      .then((d) => setLedger(d.ledger || []))
      .catch(() => {});
  }, [data?.balance]); // balance 变化时刷新账本

  if (!data) return null;

  return (
    <div>
      {/* 档案卡 */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white p-4 shadow-lg shadow-amber-200/70 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-4xl shadow-inner">
            {user?.avatar}
          </div>
          <div className="flex-1">
            <div className="font-black text-xl">{user?.name}</div>
            <div className="text-amber-100 text-sm">
              {family?.name} · {data.completionsToday.filter((c) => c.status === "approved").length} 项今日完成
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">🪙 {data.balance}</div>
            <div className="text-amber-100 text-xs">时币余额</div>
          </div>
        </div>
      </div>

      {/* 好友入口 */}
      <Link to="/child/friends" className="card flex items-center gap-3 mb-4 hover:border-sky-300 transition">
        <span className="text-3xl">👫</span>
        <div className="flex-1">
          <div className="font-extrabold text-slate-800">我的好友</div>
          <div className="text-xs text-slate-400">用宝贝号互相加好友、送时币、留言</div>
        </div>
        <span className="text-slate-300">›</span>
      </Link>

      {/* 账本 */}
      <h3 className="font-extrabold text-slate-600 mb-2">📒 我的账本</h3>
      {ledger.length === 0 ? (
        <div className="card">
          <Empty text="还没有记录，去做第一个任务吧！" emoji="📭" />
        </div>
      ) : (
        <div className="card !p-2">
          {ledger.slice(0, 50).map((l: any) => {
            const meta = fmtLedger(l.kind);
            return (
              <div key={l.id} className="flex items-center gap-3 px-2 py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-xl">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{meta.label}</div>
                  <div className="text-xs text-slate-400 truncate">{l.note || "·"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-black ${l.amount > 0 ? "text-green-600" : "text-rose-500"}`}>
                    {l.amount > 0 ? "+" : ""}
                    {l.amount}
                  </div>
                  <div className="text-[0.65rem] text-slate-300">{fmtDate(l.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={async () => {
          await logout();
          toast("已退出登录");
        }}
        className="btn btn-danger w-full py-3 mt-5"
      >
        退出登录
      </button>
    </div>
  );
}
