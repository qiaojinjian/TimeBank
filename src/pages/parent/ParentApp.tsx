import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/ui";
import Dashboard from "./Dashboard";
import Approvals from "./Approvals";
import TaskManage from "./TaskManage";
import RewardManage from "./RewardManage";
import SettingsPage from "./SettingsPage";

export default function ParentApp() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const doLogout = async () => {
    if (!window.confirm("确定要退出登录吗？")) return;
    await logout();
    toast("已退出登录");
  };
  const items = [
    { to: "/parent/home", icon: "🏠", label: "概览" },
    { to: "/parent/approvals", icon: "✅", label: "审批" },
    { to: "/parent/tasks", icon: "📋", label: "任务" },
    { to: "/parent/rewards", icon: "🎁", label: "奖励" },
    { to: "/parent/settings", icon: "⚙️", label: "设置" },
  ];
  return (
    <div className="page">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl">🏦</span>
          <div>
            <div className="font-black text-slate-800 leading-tight">家长控制台</div>
            <div className="text-xs text-slate-400">{user?.name || "家长"}</div>
          </div>
        </div>
        <button onClick={doLogout} className="btn btn-soft text-sm px-4 py-2">
          退出登录
        </button>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/parent/home" replace />} />
        <Route path="/parent/home" element={<Dashboard />} />
        <Route path="/parent/approvals" element={<Approvals />} />
        <Route path="/parent/tasks" element={<TaskManage />} />
        <Route path="/parent/rewards" element={<RewardManage />} />
        <Route path="/parent/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/parent/home" replace />} />
      </Routes>

      <nav className="bottom-nav">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span className="icon">{it.icon}</span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
