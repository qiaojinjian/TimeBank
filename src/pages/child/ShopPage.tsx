import { useState } from "react";
import { get, post } from "../../lib/api";
import { useHome } from "./ChildApp";
import { Sheet, useToast, Empty } from "../../lib/ui";
import LotteryPanel from "./LotteryPanel";
import { IfIcon } from "../../lib/Icon";

export default function ShopPage() {
  const { data, reload } = useHome();
  const toast = useToast();
  const [rewards, setRewards] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadRewards = async () => {
    if (loaded) return;
    try {
      const d = await get<{ rewards: any[] }>("/api/shop");
      setRewards(d.rewards || []);
      setLoaded(true);
    } catch {
      /* ignore */
    }
  };
  void loadRewards();

  const redeem = async (r: any) => {
    setBusy(true);
    try {
      await post("/api/redeem", { rewardId: r.id });
      toast(`申请兑换「${r.title}」成功！等家长兑现就 OK`);
      await reload();
    } catch (e: any) {
      toast(e?.message || "出错了");
    } finally {
      setBusy(false);
    }
  };

  const doCashout = async () => {
    setBusy(true);
    try {
      const r = await post<{ ok: boolean; moneyFen: number }>("/api/cashout", { coins });
      toast(`申请成功！家长确认后会给你 ${(r.moneyFen / 100).toFixed(r.moneyFen % 100 ? 2 : 0)} 元零花钱`);
      setCashoutOpen(false);
      await reload();
    } catch (e: any) {
      toast(e?.message || "出错了");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;
  const rate = data.exchangeRate;
  const money = Math.floor((coins * 100) / rate);

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-1.5">
        <IfIcon name="shop" />
        奖励商店
      </h2>
      <p className="text-sm text-slate-400 mb-4">花时币换奖励，都是家长可以兑现的哦</p>

      <LotteryPanel />

      {data.pendingRedemptions > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2.5 text-sm font-bold mb-4">
          ⏳ 你有 {data.pendingRedemptions} 个申请在等家长确认，耐心等一下～
        </div>
      )}

      {/* 零花钱兑换 */}
      <button
        onClick={() => {
          setCoins(Math.min(rate, Math.floor(data.balance / rate) * rate || rate));
          setCashoutOpen(true);
        }}
        className="w-full mb-4 rounded-2xl p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/70 text-left flex items-center justify-between"
      >
        <div>
          <div className="font-black text-lg flex items-center gap-1.5">
            <IfIcon name="banknote" />
            时币换零花钱
          </div>
          <div className="text-emerald-100 text-sm mt-0.5">
            {rate} 时币 = 1 元 · 家长给真钱
          </div>
        </div>
        <span className="bg-white/25 rounded-full px-4 py-2 text-sm font-bold">去换 →</span>
      </button>

      {/* 奖励列表 */}
      <h3 className="font-extrabold text-slate-600 mb-2 flex items-center gap-1.5">
        <IfIcon name="gift" />
        可以用时币兑换的
      </h3>
      {rewards.length === 0 ? (
        <Empty text="商店还没上架东西，让家长来放几个奖励吧" emoji="🛒" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rewards.map((r: any) => (
            <div key={r.id} className="card flex flex-col items-center !p-4">
              <div className="text-4xl mb-1">{r.icon}</div>
              <div className="font-extrabold text-center mb-0.5">{r.title}</div>
              <div className="coin text-base mb-3">🪙 {r.price}</div>
              <button
                disabled={busy || data.balance < r.price}
                onClick={() => redeem(r)}
                className="btn btn-gold w-full py-2 text-sm"
              >
                {data.balance < r.price ? "时币不够" : "兑换"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        💡 兑换后时币会先扣除，家长确认后才会真的兑现给你。被拒绝的话时币会退回。
      </p>

      {/* 兑换零花钱弹层 */}
      <Sheet open={cashoutOpen} onClose={() => setCashoutOpen(false)} title="💵 时币换零花钱">
        <div className="bg-emerald-50 rounded-xl p-3 mb-4 text-sm text-emerald-800 text-center">
          {rate} 时币 = 1 元 · 钱包里有 {data.balance} 时币
        </div>
        <label className="field-label">打算换多少时币？</label>
        <input
          className="input text-3xl font-black text-center"
          type="number"
          inputMode="numeric"
          value={coins || ""}
          onChange={(e) => setCoins(parseInt(e.target.value, 10) || 0)}
        />
        <div className="text-center mt-3 text-lg">
          可换成 <b className="text-emerald-600">{(money / 100).toFixed(money % 100 ? 2 : 0)} 元</b> 零花钱
        </div>
        <button onClick={doCashout} disabled={busy || coins < rate || coins > data.balance} className="btn btn-green w-full py-3.5 text-lg mt-4">
          申请兑换
        </button>
        {coins > data.balance && (
          <p className="text-center text-rose-500 text-sm mt-2">钱包里的时币不够哦</p>
        )}
      </Sheet>
    </div>
  );
}
