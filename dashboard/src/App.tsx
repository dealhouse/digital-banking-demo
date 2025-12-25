import { useState } from "react";
import LoginPage from "./LoginPage";
import DashboardPage from "./pages/DashboardPage";

type Session = { token: string; email: string };

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    return token && email ? { token, email } : null;
  });

  function handleLoginSuccess(token: string, email: string) {
    localStorage.setItem("token", token);
    localStorage.setItem("email", email);
    setSession({ token, email });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setSession(null);
  }

  if (!session) return <LoginPage onLoginSuccess={handleLoginSuccess} />;

  return <DashboardPage session={session} onLogout={handleLogout} />;
}

