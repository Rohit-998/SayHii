import { AuthProvider } from "@/components/auth-provider";
import { AuthScreen } from "@/components/auth-screen";

export default function RegisterPage() {
  return <AuthProvider><AuthScreen mode="register" /></AuthProvider>;
}
