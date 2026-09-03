import { useState } from "react";
import { post } from "../../lib/api";
import { useHome } from "./ChildApp";
import { useToast } from "../../lib/ui";
import { fmtDate } from "../../lib/format";
import { StatusChip } from "./HomePage";
import { IfIcon } from "../../lib/Icon";

export default function TasksPage() {
  const { data, reload } = useHome();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const complete = async (task: any) => {
    setBusyId(task.id);
    try {
      const r = await post<{ ok: boolean; status: string; amount: number }>(
        `/api/tasks/${task.id}/complete`
      );
      if (r.status === "approved") toast(`+${r.amount} 时币到账！🎉`);
      else toast("打卡成功！等家长盖章后就到账啦");
      await reload();
    } catch (e: any) {
      toast(e?.message || "出错了");
    } finally {
      setBusyId(null);
    }
  };

  if (!data) return null;
  const pending = data.completionsToday.filter((c) => c.status === "pending");

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-1.5">
        <IfIcon name="order" />
        任务打卡
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        完成了就点一下，时币 <b className="coin">+</b> 起来！
      </p>

      <div className="space-y-3">
        {data.tasks.length === 0 && (
          <div className="card text-center py-10 text-slate-400">
            <div className="text-4xl mb-2">🌱</div>
            现在没有可做的任务，等家长发布吧
          </div>
        )}
        {data.tasks.map((t: any) => (
          <div
            key={t.id}
            className={`card flex items-center gap-3 ${t.doneToday ? "opacity-60" : ""}`}
          >
            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-2xl shrink-0">
              {t.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-800 truncate">{t.title}</div>
              <div className="text-xs text-slate-400">
                {t.kind === "daily" ? "每天一次" : "一次任务"} ·{" "}
                {t.approve === "auto" ? "打卡立即到账" : "家长确认后到账"}
              </div>
            </div>
            {t.doneToday ? (
              <span className="text-green-600 text-sm font-bold shrink-0">✓ 今天完成</span>
            ) : t.pendingToday ? (
              <span className="text-amber-600 text-sm font-bold shrink-0">⏳ 待盖章</span>
            ) : (
              <button
                disabled={busyId === t.id}
                onClick={() => complete(t)}
                className="btn btn-green shrink-0 px-4 py-2.5 text-sm"
              >
                {busyId === t.id ? "…" : `+${t.amount} 打卡`}
              </button>
            )}
          </div>
        ))}
      </div>

      {(pending.length > 0 || data.completionsToday.length > 0) && (
        <div className="mt-6">
          <h3 className="font-extrabold text-slate-600 mb-2 text-sm">今天打过卡</h3>
          <div className="card space-y-2 !py-3">
            {data.completionsToday.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span>{c.icon}</span>
                <span className="flex-1 truncate">{c.title}</span>
                <StatusChip status={c.status} />
                <span className="text-slate-300 text-xs">{fmtDate(c.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
