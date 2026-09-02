import { useEffect, useState } from "react";
import { get, post, put, del } from "../../lib/api";
import { Sheet, useToast, Empty } from "../../lib/ui";
import { AVATARS } from "../../lib/format";

interface FamilyInfo {
  name: string;
  code: string;
  exchangeRate: number;
  interest7: number;
  interest14: number;
  interest30: number;
}

export default function SettingsPage() {
  const toast = useToast();
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [kids, setKids] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [kidOpen, setKidOpen] = useState(false);
  const [kidForm, setKidForm] = useState<any>({ name: "", avatar: "😀", pin: "" });

  const [pinKid, setPinKid] = useState<any>(null);
  const [pinValue, setPinValue] = useState("");

  const [renameKid, setRenameKid] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");

  const load = async () => {
    try {
      const [s, k] = await Promise.all([
        get<{ family: FamilyInfo }>("/api/parent/settings"),
        get("/api/parent/kids"),
      ]);
      setFamily(s.family);
      setKids(k.kids || []);
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    if (!family) return;
    setBusy(true);
    try {
      await post("/api/parent/settings", family);
      toast("设置已保存");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addKid = async () => {
    if (!kidForm.name.trim()) return toast("填个名字");
    if (!/^\d{4,6}$/.test(kidForm.pin)) return toast("密码 4~6 位数字");
    setBusy(true);
    try {
      await post("/api/parent/kids", kidForm);
      toast(`已添加 ${kidForm.name}，记得让他用家庭码 + 密码登录`);
      setKidOpen(false);
      setKidForm({ name: "", avatar: "😀", pin: "" });
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const savePin = async () => {
    setBusy(true);
    try {
      await put(`/api/parent/kids/${pinKid.id}`, { action: "reset-pin", pin: pinValue });
      toast("新密码设置成功，记得告诉孩子");
      setPinKid(null);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doRename = async () => {
    setBusy(true);
    try {
      await put(`/api/parent/kids/${renameKid.id}`, { name: renameValue, avatar: renameKid.avatar });
      toast("已改名");
      setRenameKid(null);
      await load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const delKid = async (k: any) => {
    if (!window.confirm(`确定删除 ${k.name} 吗？这个操作不能恢复。`)) return;
    try {
      await del(`/api/parent/kids/${k.id}`);
      toast("已删除");
      await load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  if (!family) return <div className="py-20 text-center text-slate-300 text-3xl">⏳</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800 mb-1">⚙️ 设置</h2>
        <p className="text-xs text-slate-400">利率、兑换比例，以及小朋友的管理都在这里</p>
      </div>

      {/* 兑换比例 */}
      <div className="card space-y-4">
        <div>
          <label className="field-label">💵 零花钱兑换比例（多少时币 = 1 元）</label>
          <input
            className="input text-xl font-black"
            type="number" inputMode="numeric"
            value={family.exchangeRate || ""}
            onChange={(e) => setFamily({ ...family, exchangeRate: parseInt(e.target.value, 10) || 0 })}
          />
          <p className="text-[0.7rem] text-slate-400 mt-1">
            例：10 表示 10 时币换 1 元真钱。兑换需要你在线下把钱交给孩子并审批
          </p>
        </div>
      </div>

      {/* 定期利率 */}
      <div className="card space-y-4">
        <div className="font-extrabold text-slate-700">🏦 定期利率</div>
        {[
          { key: "interest7", label: "7 天定期（%）", hint: "约一周的零花钱计划" },
          { key: "interest14", label: "14 天定期（%）", hint: "两周耐心挑战" },
          { key: "interest30", label: "30 天定期（%）", hint: "一个月的长期目标" },
        ].map((it: any) => (
          <div key={it.key}>
            <label className="field-label">{it.label}</label>
            <input
              className="input text-xl font-black"
              type="number" inputMode="numeric"
              value={(family as any)[it.key] ?? ""}
              onChange={(e) => setFamily({ ...family, [it.key]: parseInt(e.target.value, 10) || 0 })}
            />
            <p className="text-[0.7rem] text-slate-400 mt-1">{it.hint}</p>
          </div>
        ))}
        <button onClick={saveSettings} disabled={busy} className="btn btn-primary w-full py-3">
          保存设置
        </button>
      </div>

      {/* 家庭码 */}
      <div className="card">
        <label className="field-label">家庭码（孩子登录用）</label>
        <div className="text-3xl font-black tracking-[0.25em] text-indigo-600">{family.code}</div>
        <p className="text-[0.7rem] text-slate-400 mt-1">把家庭码告诉孩子，他会自己选头像登录</p>
      </div>

      {/* 孩子管理 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-extrabold text-slate-700">🧒 管理小朋友</div>
          <button className="btn btn-primary text-sm px-4 py-1.5" onClick={() => setKidOpen(true)}>
            + 添加
          </button>
        </div>
        {kids.length === 0 ? (
          <Empty text="还没有小朋友，添加第一个吧" emoji="🧒" />
        ) : (
          <div className="space-y-2.5">
            {kids.map((k) => (
              <div key={k.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-2.5">
                <span className="text-2xl">{k.avatar}</span>
                <div className="flex-1">
                  <div className="font-extrabold text-sm">{k.name}</div>
                  <div className="text-xs text-slate-400">🪙 {k.balance.toLocaleString()}</div>
                </div>
                <button className="btn btn-soft text-xs px-2.5 py-1" onClick={() => { setRenameKid(k); setRenameValue(k.name); }}>改名</button>
                <button className="btn btn-soft text-xs px-2.5 py-1" onClick={() => { setPinKid(k); setPinValue(""); }}>改密码</button>
                <button className="btn btn-danger text-xs px-2.5 py-1" onClick={() => delKid(k)}>删除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加孩子 */}
      <Sheet open={kidOpen} onClose={() => setKidOpen(false)} title="🧒 添加小朋友">
        <div className="mb-3">
          <label className="field-label">名字</label>
          <input className="input" value={kidForm.name} maxLength={12} placeholder="小名或昵称"
            onChange={(e) => setKidForm({ ...kidForm, name: e.target.value })} />
        </div>
        <div className="mb-3">
          <label className="field-label">头像</label>
          <div className="grid grid-cols-8 gap-1.5">
            {AVATARS.map((a) => (
              <button key={a} onClick={() => setKidForm({ ...kidForm, avatar: a })}
                className={`text-2xl rounded-lg py-0.5 ${kidForm.avatar === a ? "bg-sky-100 ring-2 ring-sky-300" : "hover:bg-slate-50"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="field-label">登录密码（4~6 位数字）</label>
          <input className="input text-2xl tracking-[0.4em] text-center" type="password" inputMode="numeric"
            value={kidForm.pin} maxLength={6}
            onChange={(e) => setKidForm({ ...kidForm, pin: e.target.value.replace(/\D/g, "") })} />
        </div>
        <button onClick={addKid} disabled={busy} className="btn btn-primary w-full py-3.5 text-lg">
          添加小朋友
        </button>
      </Sheet>

      {/* 改密码 */}
      <Sheet open={!!pinKid} onClose={() => setPinKid(null)} title={`🔑 重置 ${pinKid?.name} 的密码`}>
        <input className="input text-2xl tracking-[0.4em] text-center" type="password" inputMode="numeric"
          value={pinValue} maxLength={6}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))} placeholder="新密码 4~6 位" />
        <button onClick={savePin} disabled={busy} className="btn btn-primary w-full py-3.5 text-lg mt-4">
          确认修改
        </button>
      </Sheet>

      {/* 改名 */}
      <Sheet open={!!renameKid} onClose={() => setRenameKid(null)} title={`✏️ 给 ${renameKid?.name} 改名`}>
        <input className="input text-xl font-black" value={renameValue} maxLength={12}
          onChange={(e) => setRenameValue(e.target.value)} />
        <button onClick={doRename} disabled={busy} className="btn btn-primary w-full py-3.5 text-lg mt-4">
          确认改名
        </button>
      </Sheet>
    </div>
  );
}
