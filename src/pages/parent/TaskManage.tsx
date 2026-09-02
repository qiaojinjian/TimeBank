import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Sheet, useToast, Empty } from "../../lib/ui";
import { TASK_ICONS } from "../../lib/format";

export default function TaskManage() {
  const toast = useToast();
  const { kids } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({
    title: "",
    icon: "⭐",
    kind: "daily",
    amount: 3,
    approve: "manual",
    assignee: "",
  });

  const load = async () => {
    try {
      const d = await get("/api/parent/tasks");
      setTasks(d.tasks || []);
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title.trim()) return toast("填个任务名");
    setBusy(true);
    try {
      await post("/api/parent/tasks", { ...form, assignee: form.assignee || null });
      toast(form.id ? "已保存" : "任务发布成功！");
      setOpen(false);
      setForm({ title: "", icon: "⭐", kind: "daily", amount: 3, approve: "manual", assignee: "" });
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t: any) => {
    try {
      await post(`/api/parent/tasks/${t.id}/toggle`, { active: !t.active });
      await load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-800">📋 任务管理</h2>
        <button className="btn btn-primary text-sm px-4 py-2" onClick={() => { setForm({ title: "", icon: "⭐", kind: "daily", amount: 3, approve: "manual", assignee: "" }); setOpen(true); }}>
          + 发任务
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-3 -mt-2">孩子完成任务，你确认后系统自动把时币打给他</p>

      {tasks.length === 0 ? (
        <div className="card"><Empty text="还没有任务，发一个试试？" emoji="📋" /></div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((t: any) => (
            <div key={t.id} className={`card flex items-center gap-3 ${!t.active ? "opacity-55" : ""}`}>
              <span className="text-2xl">{t.icon}</span>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  setForm({
                    id: t.id, title: t.title, icon: t.icon, kind: t.kind,
                    amount: t.amount, approve: t.approve, assignee: t.assignee || "",
                  });
                  setOpen(true);
                }}
              >
                <div className="font-extrabold text-sm truncate">
                  {t.title}
                  <span className="coin text-sm ml-1">+{t.amount}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {t.kind === "daily" ? "每天一次" : "一次任务"} · {t.approve === "auto" ? "自动到账" : "需你盖章"} ·{" "}
                  {t.assignee_name ? `指定 ${t.assignee_name}` : "所有人可做"}
                </div>
              </div>
              <button
                onClick={() => toggle(t)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${t.active ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}
              >
                {t.active ? "进行中" : "已暂停"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={form.id ? "编辑任务" : "发布新任务"}>
        <div className="mb-3">
          <label className="field-label">任务名</label>
          <input className="input" value={form.title} maxLength={24} placeholder="比如：睡前刷牙、晨读30分钟"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div className="mb-3">
          <label className="field-label">图标</label>
          <div className="grid grid-cols-8 gap-1.5">
            {TASK_ICONS.map((ic) => (
              <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                className={`text-xl rounded-lg py-1 ${form.icon === ic ? "bg-sky-100 ring-2 ring-sky-300" : "hover:bg-slate-50"}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="field-label">类型</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setForm({ ...form, kind: "daily" })}
              className={`btn py-2.5 ${form.kind === "daily" ? "btn-primary" : "btn-soft"}`}>
              每天习惯
            </button>
            <button onClick={() => setForm({ ...form, kind: "once" })}
              className={`btn py-2.5 ${form.kind === "once" ? "btn-primary" : "btn-soft"}`}>
              一次性任务
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="field-label">完成奖励（时币）</label>
          <input className="input text-xl font-black" type="number" inputMode="numeric" value={form.amount || ""}
            onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value, 10) || 0 })} />
        </div>

        <div className="mb-3">
          <label className="field-label">到账方式</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setForm({ ...form, approve: "manual" })}
              className={`btn py-2.5 text-sm ${form.approve === "manual" ? "btn-gold" : "btn-soft"}`}>
              🖐 孩子打卡后我来确认
            </button>
            <button onClick={() => setForm({ ...form, approve: "auto" })}
              className={`btn py-2.5 text-sm ${form.approve === "auto" ? "btn-gold" : "btn-soft"}`}>
              ⚡ 打卡立即自动到账
            </button>
          </div>
          <p className="text-[0.7rem] text-slate-400 mt-1">
            推荐：线下任务选「我来确认」，看得到的习惯（如读书计时）可选自动
          </p>
        </div>

        <div className="mb-4">
          <label className="field-label">给谁做</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setForm({ ...form, assignee: "" })}
              className={`btn text-sm px-3 py-1.5 ${!form.assignee ? "btn-primary" : "btn-soft"}`}>
              全家所有孩子
            </button>
            {kids.map((k) => (
              <button key={k.id} onClick={() => setForm({ ...form, assignee: k.id })}
                className={`btn text-sm px-3 py-1.5 ${form.assignee === k.id ? "btn-primary" : "btn-soft"}`}>
                {k.avatar} {k.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={busy} className="btn btn-primary w-full py-3.5 text-lg">
          {form.id ? "保存修改" : "发布任务"}
        </button>
      </Sheet>
    </div>
  );
}
