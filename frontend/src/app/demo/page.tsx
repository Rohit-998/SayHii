import { AuthProvider } from "@/components/auth-provider";
import { ChatApp } from "@/components/chat-app";
import { demoUser } from "@/lib/demo";

export default function DemoPage() {
  return <AuthProvider demo demoUser={demoUser}><ChatApp /></AuthProvider>;
}
