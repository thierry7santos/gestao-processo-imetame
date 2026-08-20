/**
 * Bearer-token gate for the app's MCP endpoints.
 *
 * The MCP server is otherwise anonymously reachable once the app is published,
 * so every MCP/REST handler must pass through this guard first. The expected
 * token lives only in the server runtime (MCP_ACCESS_TOKEN secret) and is never
 * shipped to the browser.
 */
export function checkMcpAuth(request: Request): Response | undefined {
  const expected = process.env["MCP_ACCESS_TOKEN"];

  if (!expected) {
    console.error("MCP_ACCESS_TOKEN is not configured; refusing MCP request.");
    return json({ error: "MCP server is not configured." }, 503);
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = match?.[1]?.trim();

  if (!provided || !safeEqual(provided, expected)) {
    return json({ error: "Unauthorized" }, 401, {
      "www-authenticate": 'Bearer realm="mcp", error="invalid_token"',
    });
  }

  return undefined;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
