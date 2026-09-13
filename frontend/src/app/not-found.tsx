import Link from "next/link";

export default function NotFound() {
  return <main className="status-screen"><span className="eyebrow">A LITTLE OFF THE PATH</span><h1>This conversation<br />is somewhere else.</h1><Link className="button primary" href="/">Back to SayHii</Link></main>;
}
