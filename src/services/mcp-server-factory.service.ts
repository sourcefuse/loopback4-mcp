import {bind, BindingScope, Context, inject, service} from '@loopback/core';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {McpToolRegistry} from './mcp-tool-registry.service';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol';
import {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';

@bind({scope: BindingScope.REQUEST})
export class McpServerFactory {
  constructor(
    @inject.context()
    private readonly ctx: Context,
    @service(McpToolRegistry)
    private readonly toolRegistry: McpToolRegistry,
  ) {}

  /**
   * Create a new MCP server instance with tool registration
   * Uses singleton registry with pre-computed tools and controller instances
   */
  createServer(): McpServer {
    // Create fresh server instance
    const server = new McpServer(
      {
        name: 'Project management MCP server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Tool registration from singleton registry
    const toolDefinitions = this.toolRegistry.getToolDefinitions();
    for (const toolDef of toolDefinitions) {
      // Adapt the registry handler to work with the new API signature
      const adaptedHandler = async (
        parameters: Record<string, unknown>,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => {
        // Handle common double-wrapping patterns
        const cleanedParameters: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(parameters)) {
          // Skip non-objects and null/undefined values
          if (!value || typeof value !== 'object') {
            cleanedParameters[key] = value;
            continue;
          }

          const valueObj = value as Record<string, unknown>;
          // Pattern: Parameter value wrapped in object with same key
          // e.g., "currency": {"currency": {...actual data...}}
          cleanedParameters[key] =
            key in valueObj && Object.keys(valueObj).length === 1
              ? valueObj[key]
              : value;
        }

        const result = await toolDef.handler(
          this.ctx,
          cleanedParameters,
          extra,
        );
        return result;
      };

      // Use the new registerTool API with type assertion to avoid deep type recursion
      const registerTool = (
        server as unknown as {
          registerTool(
            name: string,
            config: {description: string; inputSchema: unknown},
            handler: Function,
          ): void;
        }
      ).registerTool;

      registerTool.call(
        server,
        toolDef.name,
        {
          description: toolDef.description,
          inputSchema: toolDef.schema,
        },
        adaptedHandler,
      );
    }

    return server;
  }
}
