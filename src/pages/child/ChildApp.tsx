import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { get } from "../../lib/api";
import { useAuth } from "../../lib/auth";

import HomePage from "./HomePage";
import TasksPage from "./TasksPage";
import BankPage from "./BankPage";
import ShopPage from "./ShopPage";
import MePage from "./MePage";
import FriendsPage from "./FriendsPage";

// 首页数据共享
interface HomeData {
  balance: number;
  exchangeRate: number;
  interest: { 7: number; 14: number; 30: number };
  tasks: any[];
  completionsToday: any[];
  goals: any[];
  deposits: any[];
  pendingRedemptions: number;
}
const HomeCtx = createContext<{ data: HomeData | null; reload: () => Promise<void> }>({
  data: null,
  reload: async () => {},
});
export const useHome = () => useContext(HomeCtx);

function Nav({ pending }: { pending: number }) {
  const items = [
    { to: "/child/home", icon: "🏠", label: "大厅" },
    { to: "/child/tasks", icon: "📋", label: "任务" },
    { to: "/child/bank", icon: "🏦", label: "银行" },
    { to: "/child/shop", icon: "🛍️", label: "商店" },
    { to: "/child/me", icon: "🏅", label: "我的" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="icon">
            {it.icon}
            {it.to === "/child/shop" && pending > 0 && <span className="badge-num">{pending}</span>}
          </span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function ChildApp() {
  const { user, family } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  const reload = useCallback(async () => {
    try {
      const d = await get<HomeData>("/api/home");
      setData(d);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <HomeCtx.Provider value={{ data, reload }}>
      <div className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/child/home" replace />} />
          <Route path="/child/home" element={<HomePage />} />
          <Route path="/child/tasks" element={<TasksPage />} />
          <Route path="/child/bank" element={<BankPage />} />
          <Route path="/child/shop" element={<ShopPage />} />
          <Route path="/child/me" element={<MePage />} />
          <Route path="/child/friends" element={<FriendsPage />} />
          <Route path="*" element={<Navigate to="/child/home" replace />} />
        </Routes>
      </div>
      <Nav pending={data?.pendingRedemptions || 0} />
    </HomeCtx.Provider>
  );
}
