import { spawn } from "node:child_process";

const viteArgs = ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)];

const commands = [
  { label: "api", args: ["--watch", "src-api/dev-server.js"] },
  { label: "web", args: viteArgs },
];

let stopping = false;
const children = [];

function prefixOutput(label, stream) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";
    for (const line of lines) {
      if (line) console.log(`[${label}] ${line}`);
    }
  });
  stream.on("end", () => {
    if (pending) console.log(`[${label}] ${pending}`);
  });
}

function stopAll(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(exitCode), 100);
}

for (const command of commands) {
  const child = spawn(process.execPath, command.args, {
    stdio: ["inherit", "pipe", "pipe"],
  });
  children.push(child);
  prefixOutput(command.label, child.stdout);
  prefixOutput(command.label, child.stderr);
  child.on("error", (error) => {
    console.error(`[${command.label}] ${error.message}`);
    stopAll(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`[${command.label}] exited with code ${code ?? 1}`);
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
