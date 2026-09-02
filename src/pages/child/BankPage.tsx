import { useState } from "react";
import { post } from "../../lib/api";
import { useHome } from "./ChildApp";
import { Sheet, useToast } from "../../lib/ui";
import { fmtDay, remainingDays } from "../../lib/format";

const TERMS = [
  { days: 7, name: "7天", tip: "短期存" },
  { days: 14, name: "14天", tip: "一周多" },
  { days: 30, name: "30天", tip: "整月存" },
];

const PRESETS = [10, 20, 50, 100];

export default function BankPage() {
  const { data, reload } = useHome();
  const toast = useToast();

  const [depositOpen, setDepositOpen] = useState(false);
  const [termDays, setTermDays] = useState(7);
  const [amount, setAmount] = useState<number>(10);

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState(100);

  const [goalDeposit, setGoalDeposit] = useState<any>(null); // {id,title}
  const [gdAmount, setGdAmount] = useState(5);

  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const { balance, deposits, goals, exchangeRate, interest } = data;
  const rateFor = (d: number) => (d >= 30 ? interest[30] : d >= 14 ? interest[14] : interest[7]);

  const doDeposit = async () => {
    if (amount < 5) return toast("最少存 5 时币哦");
    setBusy(true);
    try {
      const r = await post<{ ok: boolean; interest: number }>("/api/deposit", {
        amount,
        termDays,
      });
      toast(`存好啦！到期可得利息 +${r.interest} 时币 💰`);
      setDepositOpen(false);
      await reload();
    } catch (e: any) {
      toast(e?.message || "出错了");
    } finally {
      setBusy(false);
    }
  };

  const createGoal = async () => {
    if (!goalTitle.trim()) return toast("给存钱罐起个名字吧");
    setBusy(true);
    try {
      await post("/api/goals", { title: goalTitle, icon: "🎯", target: goalTarget });
      toast("存钱罐建好啦，开始往里存钱吧！");
      setGoalOpen(false);
      setGoalTitle("");
      await reload();
    } catch (e: any) {
      toast(e?.message || "出错了");
    } finally {
      setBusy(false);
    }
  };

  const doGoalDeposit = async () => {
    setBusy(true);
    try {
      await post(`/api/goals/${goalDeposit.id}/deposit`, { amount: gdAmount });
      toast(`存进「${goalDeposit.title}」${gdAmount} 时币！`);
      setGoalDeposit(null);
      await reload();
    } catch (e: any) {
      toast(e?.message || "出错了");
    } finally {
      setBusy(false);
    }
  };

  const activeGoals = goals.filter((g: any) => g.status === "active");
  const achievedGoals = goals.filter((g: any) => g.status === "achieved");

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-1">🏦 时间银行</h2>
      <p className="text-sm text-slate-400 mb-4">钱包里的钱可以存定期吃利息，也可以放进存钱罐</p>

      {/* 钱包 */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-200/70 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sky-100 text-sm font-bold">💰 活期钱包</span>
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs">随时可用</span>
        </div>
        <div className="text-4xl font-black my-2">🪙 {balance.toLocaleString()}</div>
        <button
          onClick={() => {
            setAmount(10);
            setTermDays(7);
            setDepositOpen(true);
          }}
          className="btn btn-white bg-white/25 hover:bg-white/35 text-white px-4 py-2 text-sm"
        >
          💰 存定期吃利息
        </button>
      </div>

      {/* 存钱罐 */}
      <h3 className="font-extrabold text-slate-600 mb-2">🎯 我的存钱罐</h3>
      {activeGoals.length === 0 && achievedGoals.length === 0 ? (
        <div className="card text-center py-8 text-slate-400 mb-4">
          <div className="text-4xl mb-1">🫙</div>
          <div className="text-sm mb-3">还没有存钱罐</div>
          <button className="btn btn-gold px-5 py-2.5" onClick={() => setGoalOpen(true)}>
            + 建一个存钱罐
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {activeGoals.map((g: any) => (
            <div key={g.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold">
                  {g.icon} {g.title}
                </span>
                <span className="coin text-base">
                  {g.saved}/{g.target}
                </span>
              </div>
              <div className="progress mb-2">
                <div style={{ width: `${Math.round(g.progress * 100)}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {Math.round(g.progress * 100)}% · 还差 {g.target - g.saved} 时币
                </span>
                <button
                  className="btn btn-green text-xs px-3 py-1.5"
                  onClick={() => {
                    setGoalDeposit(g);
                    setGdAmount(5);
                  }}
                >
                  存一笔
                </button>
              </div>
            </div>
          ))}
          {achievedGoals.length > 0 && (
            <button
              className="w-full border-2 border-dashed border-amber-300 text-amber-600 rounded-2xl py-3 font-bold text-sm"
              onClick={() => setGoalOpen(true)}
            >
              ✨ 看装满的罐子 + 建新罐子
            </button>
          )}
        </div>
      )}

      {/* 定期列表 */}
      {deposits.length > 0 && (
        <>
          <h3 className="font-extrabold text-slate-600 mb-2">📦 定期存单</h3>
          <div className="card space-y-3 !py-3 mb-4">
            {deposits.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 text-sm">
                <span className="text-xl">🏦</span>
                <div className="flex-1">
                  <div className="font-bold">
                    {d.amount} 时币 · {d.term_days}天
                  </div>
                  <div className="text-xs text-slate-400">
                    {d.rate}% · 到期利息 +{d.interest} · {fmtDay(d.end_at)} 到期
                  </div>
                </div>
                <span className="text-xs bg-sky-50 text-sky-600 rounded-full px-2 py-1 font-bold shrink-0">
                  {d.status === "matured"
                    ? "已到期 · 钱回钱包"
                    : remainingDays(d.end_at) === 0
                      ? "今天到期！"
                      : `还有 ${remainingDays(d.end_at)} 天`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 提示 */}
      <div className="text-xs text-slate-400 leading-relaxed px-1">
        💡 存定期到期后，本金 + 利息会自动回到钱包。存得越久利率越高哦～
        <br />
        💡 1 元零花钱 = {exchangeRate} 时币，可以在「商店」里兑换。
      </div>

      {/* 存定期弹层 */}
      <Sheet open={depositOpen} onClose={() => setDepositOpen(false)} title="💰 存定期">
        <label className="field-label">存多久</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TERMS.map((t) => (
            <button
              key={t.days}
              onClick={() => setTermDays(t.days)}
              className={`card !py-3 text-center ${termDays === t.days ? "!border-sky-400 bg-sky-50" : ""}`}
            >
              <div className="font-extrabold text-slate-800">{t.name}</div>
              <div className="text-xs text-slate-400">{t.tip}</div>
              <div className="text-xs text-emerald-600 font-bold mt-1">利率 {rateFor(t.days)}%</div>
            </button>
          ))}
        </div>
        <label className="field-label">存多少时币（钱包剩 {balance}）</label>
        <input
          className="input text-2xl font-black text-center"
          type="number"
          inputMode="numeric"
          value={amount || ""}
          onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
        />
        <div className="flex gap-2 mt-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`btn text-sm px-4 py-1.5 ${amount === p ? "btn-sky-200 bg-sky-200 text-sky-800" : "btn-soft"}`}
            >
              {p}
            </button>
          ))}
          <button onClick={() => setAmount(Math.max(0, balance))} className="btn btn-soft text-sm px-4 py-1.5 flex-1">
            全部
          </button>
        </div>
        <div className="bg-sky-50 rounded-xl p-3 text-sm mb-4 text-sky-800">
          到期可得：本金 {amount || 0} + 利息{" "}
          <b>{Math.floor(((amount || 0) * rateFor(termDays)) / 100)}</b> 时币
          {Math.floor(((amount || 0) * rateFor(termDays)) / 100) < 1 && "（金额太少利息不满 1 时币，建议多存点）"}
        </div>
        <button onClick={doDeposit} disabled={busy} className="btn btn-primary w-full py-3.5 text-lg">
          存入定期
        </button>
      </Sheet>

      {/* 新建存钱罐 */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="🫙 新建存钱罐">
        <div className="mb-4">
          <label className="field-label">目标是什么？</label>
          <input
            className="input"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="比如：买一套乐高"
            maxLength={20}
          />
        </div>
        {achievedGoals.length > 0 && (
          <div className="mb-4">
            <label className="field-label">已经装满的罐子 🎉</label>
            <div className="flex flex-wrap gap-2">
              {achievedGoals.map((g: any) => (
                <span key={g.id} className="bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-sm font-bold">
                  {g.icon} {g.title} ✓
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mb-4">
          <label className="field-label">需要攒多少时币？</label>
          <input
            className="input text-2xl font-black text-center"
            type="number"
            inputMode="numeric"
            value={goalTarget || ""}
            onChange={(e) => setGoalTarget(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <button onClick={createGoal} disabled={busy} className="btn btn-gold w-full py-3.5 text-lg">
          建好目标，开始攒钱！
        </button>
      </Sheet>

      {/* 给存钱罐存一笔 */}
      <Sheet open={!!goalDeposit} onClose={() => setGoalDeposit(null)} title={`🎯 存进「${goalDeposit?.title || ""}」`}>
        <div className="text-center my-4">
          <div className="text-5xl mb-2">🪙</div>
          <div className="font-bold text-slate-600 mb-1">钱包剩余 {balance} 时币</div>
        </div>
        <input
          className="input text-3xl font-black text-center"
          type="number"
          inputMode="numeric"
          value={gdAmount || ""}
          onChange={(e) => setGdAmount(parseInt(e.target.value, 10) || 0)}
        />
        <button onClick={doGoalDeposit} disabled={busy} className="btn btn-gold w-full py-3.5 text-lg mt-4">
          放进去！
        </button>
      </Sheet>
    </div>
  );
}
