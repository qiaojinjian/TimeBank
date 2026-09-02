import { AuthProvider, useAuth } from "./lib/auth";
import { ToastProvider } from "./lib/ui";
import LoginPage from "./pages/LoginPage";
import ChildApp from "./pages/child/ChildApp";
import ParentApp from "./pages/parent/ParentApp";

function Root() {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70dvh] text-slate-400">
        <div className="text-5xl mb-3">🏦</div>
        <div>儿童时间银行开门中…</div>
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return user.role === "parent" ? (
    <div className="parent-theme">
      <ParentApp />
    </div>
  ) : (
    <ChildApp />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </AuthProvider>
  );
}
