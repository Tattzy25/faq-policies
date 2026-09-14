import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

const helloInputSchema = z.object({
  name: z.string().optional()
});

const searchShopPoliciesAndFaqsInputSchema = z.object({
  store_domain: z
    .string()
    .describe("The store domain to call. This maps to https://{storedomain}/api/mcp."),
  query: z
    .string()
    .describe(
      "The question about policies or FAQs. For example, 'What is your return policy for sale items?'"
    ),
  context: z
    .string()
    .describe(
      "Additional context like the current product being viewed or the customer's situation."
    )
    .optional()
});

function createServer() {
  const server = new McpServer({
    name: "Hello MCP Server",
    version: "1.0.0"
  });

  server.registerTool(
    "hello",
    {
      description: "Returns a greeting message",
      inputSchema: helloInputSchema
    },
    async ({ name }: z.infer<typeof helloInputSchema>) => {
      return {
        content: [
          {
            text: `Hello, ${name ?? "World"}!`,
            type: "text"
          }
        ]
      };
    }
  );

  server.registerTool(
    "search_shop_policies_and_faqs",
    {
      description:
        "Answers questions about the store's policies, products, and services to build customer trust.",
      inputSchema: searchShopPoliciesAndFaqsInputSchema
    },
    async ({ store_domain, query, context }: z.infer<typeof searchShopPoliciesAndFaqsInputSchema>) => {
      const response = await fetch(`https://${store_domain}/api/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: {
            name: "search_shop_policies_and_faqs",
            arguments: {
              query,
              ...(context ? { context } : {})
            }
          }
        })
      });

      const result = await response.json() as Record<string, unknown>;

      if ("error" in result) {
        return {
          content: [
            {
              text: JSON.stringify(result),
              type: "text"
            }
          ],
          structuredContent: result,
          isError: true
        };
      }

      return {
        content: [
          {
            text: JSON.stringify(result),
            type: "text"
          }
        ],
        structuredContent: result
      };
    }
  );

  return server;
}

export default {
  fetch(request, env, ctx) {
    return createMcpHandler(createServer)(request, env, ctx);
  }
} satisfies ExportedHandler;
