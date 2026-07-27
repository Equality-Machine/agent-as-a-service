import { spawn } from "node:child_process";

export function runProcess(executable, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 300_000;
  const maxOutputBytes = options.maxOutputBytes ?? 10_000_000;
  if (options.signal?.aborted) {
    return Promise.reject(
      options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error("Process aborted"),
    );
  }
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
    const abort = () => {
      child.kill("SIGTERM");
      fail(
        options.signal.reason instanceof Error
          ? options.signal.reason
          : new Error("Process aborted"),
      );
    };
    options.signal?.addEventListener("abort", abort, { once: true });

    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
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
      options.signal?.removeEventListener("abort", abort);
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
