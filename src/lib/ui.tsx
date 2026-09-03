import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  );
}

// ---------- 底部弹层 ----------
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold">{title || ""}</h3>
          <button className="text-slate-400 text-2xl leading-none px-1" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- 小部件 ----------
export function Coin({ n, size = "lg" }: { n: number; size?: "sm" | "lg" }) {
  return (
    <span className={`coin ${size === "lg" ? "text-3xl" : "text-base"}`}>
      🪙 {typeof n === "number" ? n.toLocaleString() : n}
    </span>
  );
}

export function Empty({ text, emoji = "🌱" }: { text: string; emoji?: string }) {
  return (
    <div className="text-center py-10 text-slate-400">
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}

export function Spinner() {
  return <div className="text-center py-16 text-3xl">⏳</div>;
}
