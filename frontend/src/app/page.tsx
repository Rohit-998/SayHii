import { AuthProvider } from "@/components/auth-provider";
import { ChatApp } from "@/components/chat-app";

export default function Home() {
  return <AuthProvider><ChatApp /></AuthProvider>;
}
