import readline from "node:readline";

const endpoint = `${(process.env.AAAS_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "")}/mcp`;
const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of input) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`,
    );
    continue;
  }
  if (request.method === "notifications/initialized") continue;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(process.env.AAAS_API_TOKEN
          ? { authorization: `Bearer ${process.env.AAAS_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(request),
    });
    process.stdout.write(`${await response.text()}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: request.id ?? null,
        error: { code: -32000, message: error.message },
      })}\n`,
    );
  }
}
