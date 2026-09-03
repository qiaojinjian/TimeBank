import { useEffect, useState } from "react";
import { get, post, put, del } from "../../lib/api";
import { useHome } from "./ChildApp";
import { Sheet, useToast, Empty } from "../../lib/ui";
import { fmtDate } from "../../lib/format";

interface Friend {
  id: string;
  name: string;
  avatar: string;
  handle: string;
}

export default function FriendsPage() {
  const toast = useToast();
  const { reload } = useHome();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [handleDraft, setHandleDraft] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [active, setActive] = useState<Friend | null>(null);
  const [tab, setTab] = useState<"chat" | "gift">("chat");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [msgText, setMsgText] = useState("");
  const [giftCoins, setGiftCoins] = useState(5);
  const [giftMsg, setGiftMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setData(await get("/api/friends"));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveHandle = async () => {
    const v = handleDraft.trim().toUpperCase();
    if (!/^[A-Z0-9_]{4,16}$/.test(v)) return toast("宝贝号要 4~16 位，只能用字母、数字和下划线");
    setBusy(true);
    try {
      const r = await put<{ handle: string }>("/api/me/handle", { handle: v });
      toast("宝贝号已更新");
      setEditOpen(false);
      setData({ ...data, handle: r.handle });
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (q.trim().length < 3) return toast("至少输入 3 个字符");
    try {
      const r = await get<{ kids: any[] }>(`/api/friends/search?q=${encodeURIComponent(q.trim())}`);
      setResults(r.kids || []);
      if ((r.kids || []).length === 0) toast("没有找到，换个宝贝号试试");
    } catch (e: any) {
      toast(e.message);
    }
  };

  const add = async (handle: string) => {
    setBusy(true);
    try {
      await post("/api/friends/requests", { handle });
      toast("申请已发出，等对方同意");
      await search();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const respond = async (linkId: string, action: "accept" | "reject") => {
    setBusy(true);
    try {
      await post(`/api/friends/requests/${linkId}`, { action });
      toast(action === "accept" ? "加上啦，现在是好友！" : "已拒绝");
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openFriend = async (f: Friend) => {
    setActive(f);
    setTab("chat");
    setGiftCoins(5);
    setGiftMsg("");
    try {
      const r = await get<{ messages: any[] }>(`/api/friends/${f.id}/messages`);
      setMsgs(r.messages || []);
    } catch (e: any) {
      toast(e.message);
    }
  };

  const sendMsg = async () => {
    if (!active || !msgText.trim()) return;
    setBusy(true);
    try {
      await post(`/api/friends/${active.id}/messages`, { body: msgText });
      setMsgText("");
      const r = await get<{ messages: any[] }>(`/api/friends/${active.id}/messages`);
      setMsgs(r.messages || []);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sendGift = async () => {
    if (!active) return;
    if (giftCoins < 1) return toast("至少要送 1 时币");
    setBusy(true);
    try {
      await post(`/api/friends/${active.id}/gift`, { coins: giftCoins, message: giftMsg });
      toast("礼物已送出，等对方家长确认");
      setActive(null);
      await Promise.all([load(), reload()]);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeFriend = async () => {
    if (!active) return;
    if (!window.confirm("确定和 " + active.name + " 解除好友吗？")) return;
    setBusy(true);
    try {
      await del(`/api/friends/${active.id}`);
      toast("已解除好友");
      setActive(null);
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(data.handle);
      toast("宝贝号已复制");
    } catch {
      /* ignore */
    }
  };

  const giftStatus = (s: string) =>
    s === "pending" ? "等家长确认" : s === "approved" ? "已到账" : "已退回";

  if (!data) return <div className="py-20 text-center text-slate-300 text-3xl">⏳</div>;

  if (!data.enabled) {
    return (
      <div className="card">
        <Empty text="家长还没有开放好友功能，去问问爸爸妈妈吧" emoji="🔒" />
      </div>
    );
  }

  return (
    <div>
      {/* 我的宝贝号 */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-400 text-white p-4 shadow-lg shadow-sky-200/70 mb-4">
        <div className="text-sky-100 text-xs mb-1">我的宝贝号（好友用它找到我）</div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-2xl font-black tracking-[0.2em] truncate">{data.handle || "未设置"}</div>
          <div className="flex gap-2 shrink-0">
            <button onClick={copyHandle} className="bg-white/25 rounded-full px-3 py-1.5 text-sm font-bold">
              复制
            </button>
            <button
              onClick={() => {
                setHandleDraft(data.handle || "");
                setEditOpen(true);
              }}
              className="bg-white/25 rounded-full px-3 py-1.5 text-sm font-bold"
            >
              修改
            </button>
          </div>
        </div>
      </div>

      {/* 找好友 */}
      <h3 className="font-extrabold text-slate-600 mb-2">🔍 找好友</h3>
      <div className="flex gap-2 mb-3">
        <input
          className="input flex-1 uppercase"
          value={q}
          placeholder="输入好友的宝贝号"
          maxLength={16}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
        />
        <button onClick={search} className="btn btn-primary px-5">
          搜索
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2 mb-4">
          {results.map((k: any) => (
            <div key={k.id} className="card flex items-center gap-3">
              <span className="text-2xl">{k.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm">{k.name}</div>
                <div className="text-xs text-slate-400">{k.handle}</div>
              </div>
              {k.relation === "friend" ? (
                <span className="text-xs text-green-600 font-bold">已是好友</span>
              ) : k.relation === "outgoing" ? (
                <span className="text-xs text-amber-600 font-bold">等他同意</span>
              ) : k.relation === "incoming" ? (
                <span className="text-xs text-sky-600 font-bold">他申请加你</span>
              ) : (
                <button disabled={busy} onClick={() => add(k.handle)} className="btn btn-primary text-xs px-3 py-1.5">
                  加好友
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 收到的申请 */}
      {data.incoming.length > 0 && (
        <>
          <h3 className="font-extrabold text-slate-600 mb-2">📬 好友申请（{data.incoming.length}）</h3>
          <div className="space-y-2 mb-4">
            {data.incoming.map((r: any) => (
              <div key={r.linkId} className="card flex items-center gap-3">
                <span className="text-2xl">{r.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm">{r.name}</div>
                  <div className="text-xs text-slate-400 truncate">{r.message || "想和你做好友"}</div>
                </div>
                <button
                  disabled={busy}
                  onClick={() => respond(r.linkId, "accept")}
                  className="btn btn-green text-xs px-3 py-1.5"
                >
                  同意
                </button>
                <button
                  disabled={busy}
                  onClick={() => respond(r.linkId, "reject")}
                  className="btn btn-soft text-xs px-3 py-1.5"
                >
                  拒绝
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 好友列表 */}
      <h3 className="font-extrabold text-slate-600 mb-2">👫 我的好友（{data.friends.length}）</h3>
      {data.friends.length === 0 ? (
        <div className="card">
          <Empty text="还没有好友，用宝贝号互相加一下吧" emoji="🧑‍🤝‍🧑" />
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {data.friends.map((f: Friend) => (
            <button key={f.id} onClick={() => openFriend(f)} className="card w-full flex items-center gap-3 text-left">
              <span className="text-2xl">{f.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm">{f.name}</div>
                <div className="text-xs text-slate-400">{f.handle}</div>
              </div>
              <span className="text-slate-300">›</span>
            </button>
          ))}
        </div>
      )}

      {/* 赠送记录 */}
      {data.gifts.length > 0 && (
        <>
          <h3 className="font-extrabold text-slate-600 mb-2">💝 赠送记录</h3>
          <div className="card !p-2">
            {data.gifts.slice(0, 10).map((g: any) => (
              <div key={g.id} className="flex items-center gap-2 px-2 py-2 border-b border-slate-50 last:border-0">
                <span className="text-lg">{g.dir === "out" ? "🎈" : "💝"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {g.dir === "out" ? "送给 " + g.peer_name : g.peer_name + " 送我"}
                  </div>
                  <div className="text-[0.65rem] text-slate-400 truncate">{g.message || fmtDate(g.created_at)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-black text-sm ${g.dir === "out" ? "text-rose-500" : "text-green-600"}`}>
                    {g.dir === "out" ? "-" : "+"}
                    {g.coins}
                  </div>
                  <div className="text-[0.65rem] text-slate-300">{giftStatus(g.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        💡 赠送的时币会先扣掉，对方家长确认后才会到他账上；被退回的时币会还给你。
      </p>

      {/* 改宝贝号 */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="✏️ 修改我的宝贝号">
        <input
          className="input text-2xl font-black text-center uppercase tracking-[0.2em]"
          value={handleDraft}
          maxLength={16}
          placeholder="ABCD12"
          onChange={(e) => setHandleDraft(e.target.value.toUpperCase())}
        />
        <p className="text-[0.7rem] text-slate-400 mt-2">4~16 位，只能用字母、数字和下划线。改了记得告诉好友</p>
        <button onClick={saveHandle} disabled={busy} className="btn btn-primary w-full py-3.5 text-lg mt-4">
          保存
        </button>
      </Sheet>

      {/* 好友详情 */}
      <Sheet open={!!active} onClose={() => setActive(null)} title={(active?.avatar || "") + " " + (active?.name || "")}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setTab("chat")} className={`btn py-2 ${tab === "chat" ? "btn-primary" : "btn-soft"}`}>
            💬 留言
          </button>
          <button onClick={() => setTab("gift")} className={`btn py-2 ${tab === "gift" ? "btn-gold" : "btn-soft"}`}>
            🎁 送时币
          </button>
        </div>

        {tab === "chat" ? (
          <div>
            <div className="rounded-xl bg-slate-50 p-3 h-56 overflow-y-auto mb-3 space-y-2">
              {msgs.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-16">还没有留言，说句你好吧</div>
              ) : (
                msgs.map((m: any) => (
                  <div key={m.id} className={`flex ${m.from_user === active?.id ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                        m.from_user === active?.id ? "bg-white border border-slate-200" : "bg-sky-500 text-white"
                      }`}
                    >
                      <div>{m.body}</div>
                      <div
                        className={`text-[0.6rem] mt-0.5 ${
                          m.from_user === active?.id ? "text-slate-300" : "text-sky-100"
                        }`}
                      >
                        {fmtDate(m.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={msgText}
                maxLength={60}
                placeholder="写点什么…"
                onChange={(e) => setMsgText(e.target.value)}
              />
              <button onClick={sendMsg} disabled={busy || !msgText.trim()} className="btn btn-primary px-5">
                发送
              </button>
            </div>
            <button onClick={removeFriend} className="btn btn-danger w-full py-2.5 mt-4 text-sm">
              解除好友关系
            </button>
          </div>
        ) : (
          <div>
            <label className="field-label">送多少时币？（最多 {data.giftMax}）</label>
            <input
              className="input text-3xl font-black text-center"
              type="number"
              inputMode="numeric"
              value={giftCoins || ""}
              onChange={(e) => setGiftCoins(Math.min(data.giftMax, parseInt(e.target.value, 10) || 0))}
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[1, 5, 10].map((n) => (
                <button key={n} onClick={() => setGiftCoins(n)} className="btn btn-soft py-1.5 text-sm">
                  {n} 时币
                </button>
              ))}
            </div>
            <label className="field-label mt-4">留一句话（可不填）</label>
            <input
              className="input"
              value={giftMsg}
              maxLength={30}
              placeholder="祝你开心！"
              onChange={(e) => setGiftMsg(e.target.value)}
            />
            <button onClick={sendGift} disabled={busy || giftCoins < 1} className="btn btn-gold w-full py-3.5 text-lg mt-4">
              送出 {giftCoins} 时币
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
