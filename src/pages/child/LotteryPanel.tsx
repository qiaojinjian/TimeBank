import { useEffect, useMemo, useRef, useState } from "react";
import { get, post } from "../../lib/api";
import { useHome } from "./ChildApp";
import { Sheet, useToast } from "../../lib/ui";
import { fmtDate } from "../../lib/format";

interface Prize {
  id: string;
  title: string;
  icon: string;
  kind: string;
  coins: number;
  weight: number;
  pct: number;
}

interface Lottery {
  enabled: number;
  quota: { free: number; earned: number; bought: number; used: number; left: number; canBuy: number; price: number } | null;
  prizes: Prize[];
  draws: any[];
}

const WHEEL_COLORS = [
  "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#6366f1", "#a855f7", "#ec4899", "#ef4444",
  "#84cc16", "#0ea5e9",
];
const SETTLE_MS = 2400;
const WHEEL_SIZE = 248;

// 按权重把圆盘切成扇区，角度以 12 点方向为 0°，顺时针
function sectorsOf(prizes: Prize[]) {
  const total = prizes.reduce((s, p) => s + p.weight, 0) || 1;
  let acc = 0;
  return prizes.map((p, i) => {
    const start = (acc / total) * 360;
    acc += p.weight;
    const end = (acc / total) * 360;
    return {
      prize: p,
      start,
      end,
      center: (start + end) / 2,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
    };
  });
}

function PrizeWheel({
  prizes,
  spinning,
  landOn,
  won,
  centerIcon,
  onSettled,
}: {
  prizes: Prize[];
  spinning: boolean;
  landOn: string | null;
  won: boolean;
  centerIcon: string;
  onSettled: () => void;
}) {
  const [rot, setRot] = useState(0);
  const rotRef = useRef(0);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  const sectors = useMemo(() => sectorsOf(prizes), [prizes]);

  useEffect(() => {
    if (!spinning) return;

    // 还不知道中什么：先快速空转
    if (!landOn) {
      let raf = 0;
      let last = 0;
      const step = (t: number) => {
        if (t - last >= 16) {
          last = t;
          rotRef.current += 11;
          setRot(rotRef.current);
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }

    // 已知奖项：多转几圈后停在对应扇区
    const target = sectors.find((s) => s.prize.id === landOn);
    if (!target) {
      settledRef.current();
      return;
    }
    const half = Math.max(2, (target.end - target.start) / 2 - 4);
    const jitter = (Math.random() * 2 - 1) * half; // 别每次都停在正中间
    const want = 360 - (target.center + jitter);
    const cur = ((rotRef.current % 360) + 360) % 360;
    const delta = ((want - cur) % 360 + 360) % 360;
    rotRef.current += 360 * 4 + delta;
    setRot(rotRef.current);

    const timer = setTimeout(() => settledRef.current(), SETTLE_MS + 80);
    return () => clearTimeout(timer);
  }, [spinning, landOn, sectors]);

  const gradient =
    sectors.length === 0
      ? "#e2e8f0"
      : `conic-gradient(${sectors.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(", ")})`;

  return (
    <div className="relative mx-auto select-none" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
      <div
        className={`absolute -inset-1.5 rounded-full bg-gradient-to-br from-amber-300 to-violet-400 blur-[2px] ${won ? "glow-ring" : ""}`}
      />
      <div
        className="absolute inset-0 rounded-full border-4 border-white shadow-lg overflow-hidden"
        style={{
          background: gradient,
          transform: `rotate(${rot}deg)`,
          transition: spinning && landOn ? `transform ${SETTLE_MS}ms cubic-bezier(0.12, 0.62, 0.03, 1)` : "none",
        }}
      >
        {sectors.map((s) => (
          <div key={s.prize.id} className="absolute inset-0" style={{ transform: `rotate(${s.center}deg)` }}>
            <div className="pt-3 flex justify-center text-white" style={{ textShadow: "0 1px 2px rgb(0 0 0 / 0.35)" }}>
              <div className="w-[68px] text-center">
                <div className="text-lg leading-none">{s.prize.icon}</div>
                <div className="text-[10px] font-bold leading-tight truncate">
                  {s.prize.title.length > 5 ? `${s.prize.title.slice(0, 5)}…` : s.prize.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 指针 */}
      <div
        className="absolute left-1/2 -top-1 -translate-x-1/2 w-0 h-0 z-10"
        style={{
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "16px solid #e11d48",
        }}
      />
      {/* 中心轴 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-3xl z-10">
        {centerIcon}
      </div>
    </div>
  );
}

export default function LotteryPanel() {
  const toast = useToast();
  const { reload } = useHome();
  const [data, setData] = useState<Lottery | null>(null);
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [landOn, setLandOn] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<any>(null);

  const load = async () => {
    try {
      setData(await get<Lottery>("/api/lottery"));
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (!data || !data.enabled) return null;
  const quota = data.quota;
  const pendingCount = data.draws.filter((d: any) => d.status === "pending").length;
  // 待决定的排在最前面，避免被后来的记录挤出去
  const orderedDraws = [
    ...data.draws.filter((d: any) => d.status === "pending"),
    ...data.draws.filter((d: any) => d.status !== "pending"),
  ];

  const draw = async () => {
    if (spinning || busy) return;
    setResult(null);
    setLandOn(null);
    setSpinning(true);
    try {
      const r = await post<{ prize: any; quota: any }>("/api/lottery/draw");
      pendingRef.current = r;
      setData((d) => (d ? { ...d, quota: r.quota } : d));
      setLandOn(r.prize.prizeId); // 转盘开始往中奖扇区靠
    } catch (e: any) {
      setSpinning(false);
      toast(e.message);
    }
  };

  // 转盘停稳后再揭晓
  const onSettled = () => {
    const r = pendingRef.current;
    pendingRef.current = null;
    setSpinning(false);
    setLandOn(null);
    if (!r) return;
    setResult(r.prize);
    Promise.all([load(), reload()]);
  };

  const buy = async () => {
    setBusy(true);
    try {
      const r = await post<{ cost: number; quota: any }>("/api/lottery/buy", { count: 1 });
      toast(`买到 1 次机会，花了 ${r.cost} 时币`);
      setData((d) => (d ? { ...d, quota: r.quota } : d));
      await Promise.all([load(), reload()]);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: "claim" | "skip") => {
    setBusy(true);
    try {
      await post(`/api/lottery/draws/${id}`, { action });
      toast(action === "claim" ? "已申请兑现，等家长确认" : "好的，先收着");
      setResult(null);
      await Promise.all([load(), reload()]);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 rounded-2xl p-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200/70 text-left flex items-center justify-between"
      >
        <div>
          <div className="font-black text-lg">🎰 抽奖转盘</div>
          <div className="text-violet-100 text-sm mt-0.5">
            {quota && quota.left > 0 ? `今天还能抽 ${quota.left} 次` : "今天的次数用完啦"}
            {pendingCount > 0 && ` · ${pendingCount} 个奖品待决定`}
          </div>
        </div>
        <span className="bg-white/25 rounded-full px-4 py-2 text-sm font-bold">去抽奖 →</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="🎰 抽奖转盘">
        {/* 机会 */}
        <div className="rounded-xl bg-violet-50 text-violet-800 p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">今天还能抽</span>
            <span className="font-black text-2xl">{quota?.left ?? 0} 次</span>
          </div>
          <div className="text-xs mt-1 text-violet-600">
            免费 {quota?.free ?? 0} · 做任务送 {quota?.earned ?? 0} · 已买 {quota?.bought ?? 0} · 已抽 {quota?.used ?? 0}
          </div>
        </div>

        {/* 转盘 */}
        <div className="py-3">
          {data.prizes.length > 0 ? (
            <PrizeWheel
              prizes={data.prizes}
              spinning={spinning}
              landOn={landOn}
              won={!!result && result.kind !== "none"}
              centerIcon={result ? result.icon : spinning ? "🎰" : "🎡"}
              onSettled={onSettled}
            />
          ) : (
            <div className="text-center text-slate-400 py-10">家长还没有设置奖项，先去「奖励 → 抽奖转盘」加几个吧</div>
          )}
        </div>

        {result && (
          <div className={`text-center mb-3 ${result.kind === "none" ? "" : "prize-pop"}`}>
            <div className="font-black text-lg">
              {result.kind === "none" ? "谢谢参与！" : `恭喜抽中「${result.title}」`}
            </div>
            {result.kind === "coins" && (
              <div className="coin-pop text-amber-600 font-black text-xl mt-1">+{result.coins} 时币</div>
            )}
            {result.kind === "gift" && (
              <div className="text-slate-500 text-sm mt-1">
                要不要现在找家长兑现？先放着也行，随时可以在下面「我的奖品」里点「现在兑现」
              </div>
            )}
          </div>
        )}

        {result && result.kind === "gift" && result.status === "pending" ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button disabled={busy} onClick={() => act(result.id, "claim")} className="btn btn-green py-3">
              我要兑现
            </button>
            <button disabled={busy} onClick={() => setResult(null)} className="btn btn-soft py-3">
              稍后再说
            </button>
          </div>
        ) : (
          <button
            onClick={draw}
            disabled={spinning || busy || !quota || quota.left <= 0 || data.prizes.length === 0}
            className="btn btn-primary w-full py-3.5 text-lg mb-3"
          >
            {spinning ? "转啊转…" : quota && quota.left > 0 ? "开始抽奖" : "今天没有机会了"}
          </button>
        )}

        {/* 买机会 */}
        {(quota?.canBuy ?? 0) > 0 && quota && quota.price > 0 && (
          <button onClick={buy} disabled={busy} className="btn btn-gold w-full py-2.5 mb-3 text-sm">
            花 {quota.price} 时币再买 1 次（今天还能买 {quota.canBuy} 次）
          </button>
        )}

        {/* 概率 */}
        {data.prizes.length > 0 && (
          <div className="card !p-3 mb-3">
            <div className="font-extrabold text-sm text-slate-600 mb-2">🏆 奖项一览</div>
            {data.prizes.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm py-1">
                <span className="text-lg">{p.icon}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-xs text-slate-400">
                  {p.kind === "coins" ? `${p.coins} 时币` : p.kind === "gift" ? "礼物" : "空奖"}
                </span>
                <span className="font-black text-amber-600 w-12 text-right">{p.pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* 我的奖品 */}
        {data.draws.length > 0 && (
          <div className="card !p-3">
            <div className="font-extrabold text-sm text-slate-600 mb-2">🎁 我的奖品</div>
            {orderedDraws.slice(0, 10).map((d: any) => (
              <div key={d.id} className="py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{d.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{d.title}</div>
                    <div className="text-[0.65rem] text-slate-400">{fmtDate(d.created_at)}</div>
                  </div>
                  {d.kind === "coins" && <span className="text-amber-600 text-sm font-bold">+{d.coins}</span>}
                  {d.status === "pending" && (
                    <span className="text-[0.65rem] text-violet-600 bg-violet-50 rounded-full px-2 py-0.5 shrink-0">
                      待决定
                    </span>
                  )}
                  {d.status === "claimed" && (
                    <span className="text-[0.65rem] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 shrink-0">
                      等家长兑现
                    </span>
                  )}
                  {d.status === "skipped" && (
                    <span className="text-[0.65rem] text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 shrink-0">
                      未兑现
                    </span>
                  )}
                </div>
                {d.status === "pending" && (
                  <div className="flex gap-2 mt-1.5">
                    <button disabled={busy} onClick={() => act(d.id, "claim")} className="btn btn-green text-xs px-3 py-1.5">
                      现在兑现
                    </button>
                    <button disabled={busy} onClick={() => act(d.id, "skip")} className="btn btn-soft text-xs px-3 py-1.5">
                      不要了
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
