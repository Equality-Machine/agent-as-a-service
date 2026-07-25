import { spawn } from "node:child_process";

export function runProcess(executable, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 300_000;
  const maxOutputBytes = options.maxOutputBytes ?? 10_000_000;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      fail(new Error(`Process timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref();

    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }

    function collect(target, chunk) {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        child.kill("SIGTERM");
        fail(new Error("Process output exceeded the configured limit"));
        return;
      }
      target.push(chunk);
    }

    child.stdout.on("data", (chunk) => collect(stdout, chunk));
    child.stderr.on("data", (chunk) => collect(stderr, chunk));
    child.on("error", fail);
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const result = {
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) resolve(result);
      else {
        const error = new Error(
          `Process exited with ${code ?? signal}: ${result.stderr.trim() || result.stdout.trim()}`,
        );
        error.result = result;
        reject(error);
      }
    });
  });
}
