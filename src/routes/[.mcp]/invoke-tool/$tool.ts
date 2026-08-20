// Owned by the app (banner removed): MCP requests are gated by a bearer token.
// route: /.mcp/invoke-tool/$tool

import { createFileRoute } from "@tanstack/react-router";

import { createTanStackInvokeToolHandler } from "@lovable.dev/mcp-js/stacks/tanstack";

import mcp from "../../../lib/mcp/index";
import { checkMcpAuth } from "../../../lib/mcp/guard";

const handler = createTanStackInvokeToolHandler(mcp, { resourcePath: "/mcp", metadataPath: "/.well-known/oauth-protected-resource", trustForwardedHost: true });

export const Route = createFileRoute("/.mcp/invoke-tool/$tool")({
  server: {
    handlers: {
      ANY: (ctx: { request: Request }) => checkMcpAuth(ctx.request) ?? (handler as (c: unknown) => Response | Promise<Response>)(ctx),
    },
  },
});
