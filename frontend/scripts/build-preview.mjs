import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const integration = process.argv.includes("--integration");
const output = resolve(integration ? ".preview" : "../outputs");
await mkdir(output, { recursive: true });
const result = await build({
  entryPoints: ["scripts/preview-entry.tsx"], bundle: true, write: false,
  minify: true, format: "iife", target: "es2022", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_API_URL": '""', "process.env.NEXT_PUBLIC_SOCKJS_URL": integration ? '"https://localhost:8080/ws"' : '""', global: "globalThis" },
  plugins: [{ name: "preview-navigation", setup(build) {
    build.onResolve({ filter: /^next\/(link|navigation)$/ }, () => ({ path: resolve("scripts/preview-router.tsx") }));
  } }],
});
const processed = await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" });
const photo = (await readFile("public/forest.jpg")).toString("base64");
const css = processed.css.replaceAll("/forest.jpg", `data:image/jpeg;base64,${photo}`);
const javascript = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const fixture = integration ? `<script>${await readFile("tests/browser-fixture.js", "utf8")}</script>` : "";
const filename = integration ? "integration.html" : "SayHii-preview.html";
await writeFile(resolve(output, filename), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#143b45"><title>SayHii | Interactive Preview</title><style>${css}</style></head><body><div id="root"></div>${fixture}<script>${javascript}</script></body></html>`);
console.log(`Built ${filename} from the app's real React components.`);
