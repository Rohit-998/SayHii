import { AuthProvider } from "@/components/auth-provider";
import { AuthScreen } from "@/components/auth-screen";

export default function LoginPage() {
  return <AuthProvider><AuthScreen mode="login" /></AuthProvider>;
}
