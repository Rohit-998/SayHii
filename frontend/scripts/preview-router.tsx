import type { AnchorHTMLAttributes } from "react";

const router = {
  push: (path: string) => { window.location.hash = path; },
  replace: (path: string) => { window.location.replace(`#${path}`); },
};
export function useRouter() { return router; }
export default function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={typeof href === "string" && href.startsWith("/") ? `#${href}` : href} />;
}
