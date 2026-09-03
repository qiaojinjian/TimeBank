import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useHome } from "./ChildApp";
import { useToast, Empty } from "../../lib/ui";
import { fmtDate, fmtLedger } from "../../lib/format";
import { IfIcon } from "../../lib/Icon";

const PAGE_SIZE = 10;

interface LedgerPage {
  ledger: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

function appendRows(prev: any[], rows: any[]) {
  const seen = new Set(prev.map((r) => r.id));
  const add = rows.filter((r) => !seen.has(r.id));
  return add.length ? [...prev, ...add] : prev;
}

export default function MePage() {
  const { user, family, logout } = useAuth();
  const { data, reload } = useHome();
  const toast = useToast();
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // reset=true 拉第一页，reset=false 接游标拉下一页
  const loadPage = useCallback(async (reset: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      const cursor = reset ? null : cursorRef.current;
      if (cursor) qs.set("cursor", cursor);
      const d = await get<LedgerPage>(`/api/ledger?${qs}`);
      const rows = d.ledger || [];
      cursorRef.current = d.nextCursor ?? null;
      setHasMore(!!d.hasMore);
      setLedger((prev) => (reset ? rows : appendRows(prev, rows)));
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      busyRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // balance 变化时重置回第一页，保证新流水在顶部可见
  useEffect(() => {
    if (!data) return;
    loadPage(true);
  }, [loadPage, data?.balance]);

  // 哨兵进入视口（含底部 160px 预取）就拉下一页
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || error) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadPage(false);
      },
      { rootMargin: "160px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // ledger.length 变化后重新 observe，让浏览器立刻重新判定哨兵是否还在视口内
  }, [loadPage, hasMore, error, ledger.length]);

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
        <span className="text-3xl">
          <IfIcon name="couple" />
        </span>
        <div className="flex-1">
          <div className="font-extrabold text-slate-800">我的好友</div>
          <div className="text-xs text-slate-400">用宝贝号互相加好友、送时币、留言</div>
        </div>
        <span className="text-slate-300">›</span>
      </Link>

      {/* 账本 */}
      <h3 className="font-extrabold text-slate-600 mb-2 flex items-center gap-1.5">
        <IfIcon name="notebook" />
        我的账本
      </h3>
      {loading && ledger.length === 0 ? (
        <div className="card py-6 text-center text-sm text-slate-400">加载中…</div>
      ) : ledger.length === 0 ? (
        <div className="card">
          <Empty text="还没有记录，去做第一个任务吧！" emoji="📭" />
        </div>
      ) : (
        <div className="card !p-2">
          {ledger.map((l: any) => {
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

          {/* 懒加载哨兵：进入视口即加载下一页 */}
          <div ref={sentinelRef} className="py-3 text-center text-xs text-slate-400">
            {loadingMore ? (
              "加载中…"
            ) : error ? (
              <button className="text-sky-600 font-bold" onClick={() => loadPage(false)}>
                加载失败，点击重试
              </button>
            ) : hasMore ? (
              "上滑加载更多"
            ) : (
              "没有更多啦"
            )}
          </div>
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
