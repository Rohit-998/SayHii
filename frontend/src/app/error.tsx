"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="status-screen"><span className="eyebrow">LET'S TRY THAT AGAIN</span><h1>A little connection hiccup.</h1><p>Something went wrong while opening SayHii.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
