import { FormEvent, useEffect, useState } from "react";
import { get, post, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { AVATARS } from "../lib/format";
import { useToast } from "../lib/ui";
import { IfIcon } from "../lib/Icon";

export default function LoginPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [who, setWho] = useState<"child" | "parent">("child");
  const [err, setErr] = useState("");

  // 家长模式
  const [pTab, setPTab] = useState<"login" | "register">("login");
  const [famName, setFamName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 孩子模式
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"code" | "pick" | "pin">("code");
  const [kids, setKids] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [kidName, setKidName] = useState("");
  const [pin, setPin] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem("tb_code");
    if (c) setCode(c);
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e: any) {
      setErr(e?.message || "出错了");
    } finally {
      setBusy(false);
    }
  };

  // 家长登录/注册成功后刷新全局状态 → 自动进入家长端
  const doParent = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await post(pTab === "login" ? "/api/login" : "/api/register", {
        email,
        password,
        familyName: famName,
      });
      await refresh();
    });
  };

  // 查询家庭码对应的小朋友
  const lookup = async (c?: string) => {
    const cc = (c ?? code).trim().toUpperCase();
    if (cc.length < 4) return;
    setLookupLoading(true);
    try {
      const data = await get(`/api/public/kids?code=${encodeURIComponent(cc)}`);
      localStorage.setItem("tb_code", cc);
      if (data.kids?.length) {
        setKids(data.kids);
        setStep("pick");
      } else {
        setErr("这个家庭还没有小朋友，请家长先添加");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const pickKid = async (kid: { id: string; name: string }) => {
    setKidName(kid.name);
    setPin("");
    setErr("");
    setStep("pin");
  };

  const doChild = async (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const kid = kids.find((k) => k.name === kidName);
      if (!kid) throw new ApiError("请先选择小朋友");
      await post("/api/child-login", { code: code.trim().toUpperCase(), childId: kid.id, pin });
      await refresh();
    });
  };

  const switchWho = (w: "child" | "parent") => {
    setWho(w);
    setErr("");
  };

  return (
    <div className="page !pt-0">
      {/* 顶部 */}
      <div className="pt-10 pb-6 text-center bg-gradient-to-b from-sky-200 via-sky-100 to-transparent -mx-0 rounded-b-[2rem]">
        <div className="text-5xl mb-2">
          <IfIcon name="bank" />
        </div>
        <h1 className="text-2xl font-black text-sky-900">儿童时间银行</h1>
        <p className="text-sky-700/80 text-sm mt-1">做任务赚时币 · 存钱生利息 · 兑换大奖励</p>
      </div>

      <div className="px-5 -mt-2">
        {/* 身份切换 */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => switchWho("child")}
            className={`btn py-3 ${who === "child" ? "btn-primary" : "btn-soft"}`}
          >
            🧒 我是小朋友
          </button>
          <button
            onClick={() => switchWho("parent")}
            className={`btn py-3 ${who === "parent" ? "btn-gold" : "btn-soft"}`}
          >
            👨‍👩‍👧 我是家长
          </button>
        </div>

        {err && (
          <div className="bg-rose-50 text-rose-600 text-sm rounded-xl px-3 py-2 mb-4 font-medium">{err}</div>
        )}

        {who === "child" ? (
          <div className="card">
            {step === "code" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  lookup();
                }}
              >
                <label className="field-label">家庭码（找家长要一下）</label>
                <input
                  className="input text-2xl font-black tracking-[0.3em] uppercase text-center"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABCDEF"
                  autoFocus
                />
                <button className="btn btn-primary w-full py-3.5 mt-4 text-lg" disabled={lookupLoading}>
                  {lookupLoading ? "查找中…" : "下一步 →"}
                </button>
                <p className="text-xs text-slate-400 text-center mt-3">
                  家庭码在家长的「设置」页里可以看到
                </p>
              </form>
            )}

            {step === "pick" && (
              <div>
                <button
                  className="text-sky-600 text-sm font-bold mb-3"
                  onClick={() => {
                    setStep("code");
                    setErr("");
                  }}
                >
                  ← 换一个家庭码
                </button>
                <label className="field-label">你是谁？</label>
                <div className="grid grid-cols-3 gap-3">
                  {kids.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => pickKid(k)}
                      className="card !py-4 flex flex-col items-center hover:border-sky-300"
                    >
                      <span className="text-4xl mb-1">{k.avatar}</span>
                      <span className="text-sm font-bold text-slate-700">{k.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "pin" && (
              <form onSubmit={doChild}>
                <button
                  className="text-sky-600 text-sm font-bold mb-3"
                  onClick={() => setStep("pick")}
                  type="button"
                >
                  ← 换一个小朋友
                </button>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-1">{kids.find((k) => k.name === kidName)?.avatar}</div>
                  <div className="font-bold text-lg">{kidName}</div>
                </div>
                <label className="field-label">输入你的数字密码</label>
                <input
                  className="input text-2xl font-black tracking-[0.4em] text-center"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  autoFocus
                />
                <button className="btn btn-primary w-full py-3.5 mt-4 text-lg" disabled={busy}>
                  开门进银行 →
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setPTab("login")}
                className={`btn py-2.5 ${pTab === "login" ? "btn-gold" : "btn-soft"}`}
              >
                登录
              </button>
              <button
                onClick={() => setPTab("register")}
                className={`btn py-2.5 ${pTab === "register" ? "btn-gold" : "btn-soft"}`}
              >
                创建家庭
              </button>
            </div>

            <form onSubmit={doParent}>
              {pTab === "register" && (
                <div className="mb-3">
                  <label className="field-label">家庭昵称</label>
                  <input
                    className="input"
                    value={famName}
                    onChange={(e) => setFamName(e.target.value)}
                    placeholder="比如：快乐的一家"
                    maxLength={20}
                  />
                </div>
              )}
              <div className="mb-3">
                <label className="field-label">邮箱</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="mb-4">
                <label className="field-label">密码</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={pTab === "register" ? "至少 6 位" : "输入密码"}
                />
              </div>
              <button className="btn btn-gold w-full py-3.5 text-lg" disabled={busy}>
                {pTab === "register" ? "创建家庭并登录" : "登录"}
              </button>
            </form>
            <p className="text-xs text-slate-400 text-center mt-4">
              家长管理任务、发时币、设利率；小朋友用小卡片登录
            </p>
          </div>
        )}

        {/* 装饰性头像提示 */}
        {who === "parent" && (
          <p className="text-center text-xs text-slate-300 mt-6">
            小朋友入口 avatars：{AVATARS.slice(0, 6).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}
