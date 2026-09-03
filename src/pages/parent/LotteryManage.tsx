import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { Sheet, useToast, Empty } from "../../lib/ui";
import { REWARD_ICONS } from "../../lib/format";

interface Prize {
  id?: string;
  title: string;
  icon: string;
  kind: "coins" | "gift" | "none";
  coins: number;
  weight: number;
  active: boolean;
}

const BLANK: Prize = { title: "", icon: "🎁", kind: "coins", coins: 5, weight: 1, active: true };

const KIND_LABEL: Record<string, string> = {
  coins: "时币奖·立即到账",
  gift: "礼物奖·孩子兑现",
  none: "谢谢参与",
};

export default function LotteryManage() {
  const toast = useToast();
  const [cfg, setCfg] = useState<any>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Prize>(BLANK);

  const load = async () => {
    try {
      const d = await get<{ config: any; prizes: any[] }>("/api/parent/lottery");
      setCfg({
        dailyFree: d.config.daily_free,
        taskGiftEvery: d.config.task_gift_every,
        taskGiftCap: d.config.task_gift_cap,
        buyLimit: d.config.buy_limit,
        buyPrice: d.config.buy_price,
        enabled: !!d.config.enabled,
      });
      setPrizes(
        (d.prizes || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          icon: p.icon,
          kind: p.kind,
          coins: p.coins,
          weight: p.weight,
          active: !!p.active,
        }))
      );
    } catch (e: any) {
      toast(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalWeight = prizes.filter((p) => p.active).reduce((s, p) => s + p.weight, 0);
  const pct = (p: Prize) => (totalWeight > 0 ? Math.round((p.weight / totalWeight) * 1000) / 10 : 0);

  const save = async () => {
    if (!cfg) return;
    if (prizes.some((p) => !p.title.trim())) return toast("每个奖项都要填名字");
    setBusy(true);
    try {
      await post("/api/parent/lottery", { config: cfg, prizes });
      toast("抽奖设置已保存");
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const savePrize = () => {
    if (!form.title.trim()) return toast("填个奖项名");
    if (form.kind === "coins" && form.coins < 1) return toast("时币奖至少要 1 时币");
    if (form.weight < 1) return toast("权重至少是 1");
    setPrizes((list) =>
      form.id ? list.map((p) => (p.id === form.id ? form : p)) : [...list, { ...form, id: `new-${Date.now()}` }]
    );
    setOpen(false);
  };

  if (!cfg) return <div className="py-20 text-center text-slate-300 text-3xl">⏳</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-black text-slate-800">🎰 抽奖转盘</h2>
        <button
          className="btn btn-gold text-sm px-4 py-2"
          onClick={() => {
            setForm(BLANK);
            setOpen(true);
          }}
        >
          + 加奖项
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        孩子在「商店」里抽奖。时币奖抽中直接到账，礼物奖要孩子点「兑现」后你来确认
      </p>

      {/* 开关 */}
      <div className="card flex items-center justify-between mb-4">
        <div>
          <div className="font-extrabold text-slate-700">开启抽奖</div>
          <div className="text-xs text-slate-400">关掉后孩子在商店里看不到抽奖入口</div>
        </div>
        <button
          onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })}
          className={`btn ${cfg.enabled ? "btn-green" : "btn-soft"} px-4 py-1.5 text-sm`}
        >
          {cfg.enabled ? "已开启" : "已关闭"}
        </button>
      </div>

      {/* 机会来源 */}
      <div className="card space-y-4 mb-4">
        <div className="font-extrabold text-slate-700">🎟️ 抽奖机会从哪来</div>
        <div>
          <label className="field-label">每天无条件免费次数</label>
          <input className="input text-xl font-black" type="number" inputMode="numeric" min={0}
            value={cfg.dailyFree} onChange={(e) => setCfg({ ...cfg, dailyFree: parseInt(e.target.value, 10) || 0 })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">完成几次任务送 1 次</label>
            <input className="input text-xl font-black" type="number" inputMode="numeric" min={0}
              value={cfg.taskGiftEvery} onChange={(e) => setCfg({ ...cfg, taskGiftEvery: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div>
            <label className="field-label">每天最多送几次</label>
            <input className="input text-xl font-black" type="number" inputMode="numeric" min={0}
              value={cfg.taskGiftCap} onChange={(e) => setCfg({ ...cfg, taskGiftCap: parseInt(e.target.value, 10) || 0 })} />
          </div>
        </div>
        <p className="text-[0.7rem] text-slate-400 -mt-2">按当天「已盖章」的打卡数算，0 表示不送</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">每天可买次数</label>
            <input className="input text-xl font-black" type="number" inputMode="numeric" min={0}
              value={cfg.buyLimit} onChange={(e) => setCfg({ ...cfg, buyLimit: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div>
            <label className="field-label">每次价格（时币）</label>
            <input className="input text-xl font-black" type="number" inputMode="numeric" min={0}
              value={cfg.buyPrice} onChange={(e) => setCfg({ ...cfg, buyPrice: parseInt(e.target.value, 10) || 0 })} />
          </div>
        </div>
        <p className="text-[0.7rem] text-slate-400 -mt-2">次数当天有效，不累积到第二天</p>
      </div>

      {/* 奖项 */}
      <h3 className="font-extrabold text-slate-600 mb-2">🏆 奖项与概率（共 {prizes.length} 项）</h3>
      {prizes.length === 0 ? (
        <div className="card"><Empty text="还没有奖项，先加一个吧" emoji="🎰" /></div>
      ) : (
        <div className="space-y-2.5 mb-4">
          {prizes.map((p, i) => (
            <div key={p.id || i} className={`card flex items-center gap-3 ${!p.active ? "opacity-55" : ""}`}>
              <span className="text-3xl">{p.icon}</span>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  setForm(p);
                  setOpen(true);
                }}
              >
                <div className="font-extrabold text-sm truncate">{p.title}</div>
                <div className="text-xs text-slate-400">
                  {KIND_LABEL[p.kind]}
                  {p.kind === "coins" && ` ${p.coins} 枚`} · 权重 {p.weight}
                </div>
                <div className="progress mt-1.5">
                  <div style={{ width: `${p.active ? pct(p) : 0}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-amber-600">{p.active ? `${pct(p)}%` : "停用"}</div>
                <button
                  onClick={() =>
                    setPrizes((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
                  }
                  className="text-xs text-slate-400 mt-1"
                >
                  {p.active ? "停用" : "启用"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={busy} className="btn btn-primary w-full py-3">
        保存抽奖设置
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={form.id ? "编辑奖项" : "添加奖项"}>
        <div className="mb-3">
          <label className="field-label">奖项名</label>
          <input className="input" value={form.title} maxLength={24} placeholder="比如：看动画片 30 分钟"
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
        <div className="mb-3">
          <label className="field-label">类型</label>
          <div className="grid grid-cols-3 gap-2">
            {(["coins", "gift", "none"] as const).map((k) => (
              <button key={k} onClick={() => setForm({ ...form, kind: k })}
                className={`btn py-2 text-xs ${form.kind === k ? "btn-primary" : "btn-soft"}`}>
                {k === "coins" ? "时币奖" : k === "gift" ? "礼物奖" : "谢谢参与"}
              </button>
            ))}
          </div>
          <p className="text-[0.7rem] text-slate-400 mt-1">{KIND_LABEL[form.kind]}</p>
        </div>
        {form.kind === "coins" && (
          <div className="mb-3">
            <label className="field-label">中多少时币</label>
            <input className="input text-xl font-black" type="number" inputMode="numeric" value={form.coins || ""}
              onChange={(e) => setForm({ ...form, coins: parseInt(e.target.value, 10) || 0 })} />
          </div>
        )}
        <div className="mb-4">
          <label className="field-label">权重（越大越容易中）</label>
          <input className="input text-xl font-black" type="number" inputMode="numeric" value={form.weight || ""}
            onChange={(e) => setForm({ ...form, weight: parseInt(e.target.value, 10) || 0 })} />
        </div>
        <div className="flex gap-2">
          {form.id && (
            <button
              onClick={() => {
                setPrizes((list) => list.filter((p) => p.id !== form.id));
                setOpen(false);
              }}
              className="btn btn-danger px-4 py-3.5"
            >
              删除
            </button>
          )}
          <button onClick={savePrize} className="btn btn-gold flex-1 py-3.5 text-lg">
            确定
          </button>
        </div>
      </Sheet>
    </div>
  );
}
