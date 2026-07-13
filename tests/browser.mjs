import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const chrome = process.env.CHROME ?? "/usr/bin/google-chrome";
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm"
};

const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const file = join(packageDir, path === "/" ? "tests/browser.html" : path);
  if (!file.startsWith(packageDir)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, { "content-type": contentTypes[extname(file)] ?? "application/octet-stream" });
    response.end(content);
  } catch {
    if (!response.headersSent) response.writeHead(404);
    response.end();
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/tests/browser.html`;
const profileDir = await mkdtemp(join(tmpdir(), "nifkit-wasm-chrome-"));

try {
  const output = await new Promise((resolve, reject) => {
    const child = spawn(chrome, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      `--user-data-dir=${profileDir}`,
      "--dump-dom",
      "--virtual-time-budget=10000",
      url
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr)));
  });
  assert.match(output, /data-result="passed"/);
  console.log("nifkit-wasm browser test passed");
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(profileDir, { recursive: true, force: true });
}
