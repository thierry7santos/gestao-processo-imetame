// Owned by the app (banner removed): MCP requests are gated by a bearer token.
// route: /.mcp/list-tools

import { createFileRoute } from "@tanstack/react-router";

import { createTanStackListToolsHandler } from "@lovable.dev/mcp-js/stacks/tanstack";

import mcp from "../../lib/mcp/index";
import { checkMcpAuth } from "../../lib/mcp/guard";

const handler = createTanStackListToolsHandler(mcp, { resourcePath: "/mcp", metadataPath: "/.well-known/oauth-protected-resource", trustForwardedHost: true });

export const Route = createFileRoute("/.mcp/list-tools")({
  server: {
    handlers: {
      ANY: (ctx: { request: Request }) => checkMcpAuth(ctx.request) ?? (handler as (c: unknown) => Response | Promise<Response>)(ctx),
    },
  },
});
