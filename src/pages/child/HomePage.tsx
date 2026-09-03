import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useHome } from "./ChildApp";
import { fmtDate } from "../../lib/format";
import { Empty } from "../../lib/ui";
import { IfIcon } from "../../lib/Icon";

export default function HomePage() {
  const { user, family } = useAuth();
  const { data, reload } = useHome();
  if (!data)
    return (
      <div className="py-20 text-center text-slate-400 text-3xl">
        <IfIcon name="bank" />
      </div>
    );

  const todayCount = data.completionsToday.filter((c) => c.status === "approved").length;
  const goals = data.goals.slice(0, 2);

  return (
    <div>
      {/* 问候 + 余额 */}
      <div className="bg-gradient-to-b from-sky-400 to-sky-500 -mx-4 -mt-1 px-5 pt-7 pb-14 rounded-b-[2rem] shadow-lg shadow-sky-200/60">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-3xl shadow">
            {user?.avatar}
          </div>
          <div className="flex-1">
            <div className="text-white text-lg font-black">{user?.name}，欢迎回来！</div>
            <div className="text-sky-100 text-xs">
              {family?.name || "幸福的一家"} · 今天已完成 {todayCount} 项
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between text-white">
          <div>
            <div className="text-sky-100 text-xs mb-1">钱包余额</div>
            <div className="text-4xl font-black drop-shadow">
              🪙 {data.balance.toLocaleString()}
            </div>
          </div>
          <Link to="/child/bank" className="bg-white/25 rounded-full px-4 py-2 text-sm font-bold hover:bg-white/35">
            去存钱 →
          </Link>
        </div>
      </div>

      <div className="-mt-8 px-1">
        {/* 今日任务 */}
        <div className="card shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <IfIcon name="order" />
              今日任务
            </h3>
            <Link to="/child/tasks" className="text-sky-600 text-sm font-bold">
              全部 →
            </Link>
          </div>
          {data.tasks.length === 0 ? (
            <Empty text="今天没有待办任务，去休息吧！" emoji="🌤️" />
          ) : (
            <div className="space-y-2.5">
              {data.tasks.slice(0, 4).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{t.title}</div>
                    <div className="text-xs text-slate-400">
                      {t.kind === "daily" ? "每天一次" : "一次任务"}
                      {t.approve === "manual" && " · 等家长盖章"}
                    </div>
                  </div>
                  {t.doneToday ? (
                    <span className="text-green-600 font-bold text-sm bg-green-50 rounded-full px-2.5 py-1">
                      ✓ 已完成
                    </span>
                  ) : t.pendingToday ? (
                    <span className="text-amber-600 font-bold text-sm bg-amber-50 rounded-full px-2.5 py-1">
                      ⏳ 待盖章
                    </span>
                  ) : (
                    <span className="coin text-base">+{t.amount}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 存钱罐进度 */}
        {goals.length > 0 && (
          <div className="card shadow-sm mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <IfIcon name="moneybox" />
                我的存钱罐
              </h3>
              <Link to="/child/bank" className="text-sky-600 text-sm font-bold">
                去存 →
              </Link>
            </div>
            <div className="space-y-3">
              {goals.map((g: any) => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">
                      {g.icon} {g.title}
                    </span>
                    <span className="text-slate-500">
                      {g.saved}/{g.target} 时币
                    </span>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${Math.round(g.progress * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 今日动态 */}
        {data.completionsToday.length > 0 && (
          <div className="card shadow-sm mt-4">
            <h3 className="font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
              <IfIcon name="time" />
              今日动态
            </h3>
            <div className="space-y-2">
              {data.completionsToday.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span>{c.icon}</span>
                  <span className="flex-1 truncate">{c.title}</span>
                  <StatusChip status={c.status} />
                  <span className="text-slate-400 text-xs">{fmtDate(c.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  if (status === "approved") return <span className="text-green-600 text-xs font-bold">已到账</span>;
  if (status === "pending") return <span className="text-amber-600 text-xs font-bold">待盖章</span>;
  return <span className="text-rose-500 text-xs font-bold">未通过</span>;
}
