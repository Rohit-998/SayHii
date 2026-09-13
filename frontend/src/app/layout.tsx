import type { Metadata, Viewport } from "next";
import { MotionShell } from "@/components/motion-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SayHii | A little closer",
  description: "Your people. Your conversations. A calmer place to connect.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#143b45" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><MotionShell>{children}</MotionShell></body></html>;
}
