import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { Sheet, useToast, Empty } from "../../lib/ui";
import { REWARD_ICONS } from "../../lib/format";
import LotteryManage from "./LotteryManage";
import { IfIcon } from "../../lib/Icon";

type Tab = "rewards" | "lottery";

export default function RewardManage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("rewards");
  const [rewards, setRewards] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ title: "", icon: "🎁", price: 20 });

  const load = async () => {
    try {
      const d = await get("/api/parent/rewards");
      setRewards(d.rewards || []);
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title.trim()) return toast("填个奖励名");
    setBusy(true);
    try {
      await post("/api/parent/rewards", form);
      toast(form.id ? "已保存" : "奖励上架成功！");
      setOpen(false);
      setForm({ title: "", icon: "🎁", price: 20 });
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r: any) => {
    try {
      await post("/api/parent/rewards", { ...r, active: r.active ? 0 : 1 });
      await load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setTab("rewards")}
          className={`btn py-2.5 ${tab === "rewards" ? "btn-gold" : "btn-soft"}`}
        >
          <IfIcon name="gift" /> 奖励商店
        </button>
        <button
          onClick={() => setTab("lottery")}
          className={`btn py-2.5 ${tab === "lottery" ? "btn-gold" : "btn-soft"}`}
        >
          <IfIcon name="wheeloffortune" /> 抽奖转盘
        </button>
      </div>

      {tab === "lottery" ? (
        <LotteryManage />
      ) : (
      <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
          <IfIcon name="gift" />
          奖励商店管理
        </h2>
        <button className="btn btn-gold text-sm px-4 py-2" onClick={() => { setForm({ title: "", icon: "🎁", price: 20 }); setOpen(true); }}>
          + 上架奖励
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-3 -mt-2">
        孩子花时币兑换，你确认后负责兑现。零花钱兑换在「设置」里调比例
      </p>

      {rewards.length === 0 ? (
        <div className="card"><Empty text="还没有奖励，上架一个吧" emoji="🎁" /></div>
      ) : (
        <div className="space-y-2.5">
          {rewards.map((r: any) => (
            <div key={r.id} className={`card flex items-center gap-3 ${!r.active ? "opacity-55" : ""}`}>
              <span className="text-3xl">{r.icon}</span>
              <div
                className="flex-1 cursor-pointer"
                onClick={() => { setForm({ id: r.id, title: r.title, icon: r.icon, price: r.price }); setOpen(true); }}
              >
                <div className="font-extrabold text-sm">{r.title}</div>
                <div className="coin text-sm">🪙 {r.price}</div>
              </div>
              <button
                onClick={() => toggle(r)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${r.active ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}
              >
                {r.active ? "售卖中" : "已下架"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={form.id ? "编辑奖励" : "上架新奖励"}>
        <div className="mb-3">
          <label className="field-label">奖励名</label>
          <input className="input" value={form.title} maxLength={24} placeholder="比如：看一集动画片 30 分钟"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="mb-3">
          <label className="field-label">图标</label>
          <div className="grid grid-cols-6 gap-1.5">
            {REWARD_ICONS.map((ic) => (
              <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                className={`text-xl rounded-lg py-1 ${form.icon === ic ? "bg-amber-100 ring-2 ring-amber-300" : "hover:bg-slate-50"}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="field-label">价格（时币）</label>
          <input className="input text-xl font-black" type="number" inputMode="numeric" value={form.price || ""}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value, 10) || 0 })} />
          <p className="text-[0.7rem] text-slate-400 mt-1">参考：30 分钟屏幕时间 ≈ 3 时币</p>
        </div>
        <button onClick={save} disabled={busy} className="btn btn-gold w-full py-3.5 text-lg">
          {form.id ? "保存修改" : "上架"}
        </button>
      </Sheet>
      </div>
      )}
    </div>
  );
}
