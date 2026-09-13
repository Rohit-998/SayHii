import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionShell } from "../src/components/motion-shell";
import { AuthProvider } from "../src/components/auth-provider";
import { AuthScreen } from "../src/components/auth-screen";
import { ChatApp } from "../src/components/chat-app";
import { demoUser } from "../src/lib/demo";

function Preview() {
  const [path, setPath] = useState(window.location.hash.slice(1) || "/demo");
  useEffect(() => {
    const change = () => setPath(window.location.hash.slice(1) || "/demo");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return <MotionShell><AuthProvider key={path} demo={path === "/demo"} demoUser={demoUser}>{path === "/login" || path === "/register" ? <AuthScreen mode={path === "/register" ? "register" : "login"} /> : <ChatApp />}</AuthProvider></MotionShell>;
}

createRoot(document.getElementById("root")!).render(<Preview />);
