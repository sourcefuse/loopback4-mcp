import {bind, BindingScope, Context, inject, service} from '@loopback/core';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {McpToolRegistry} from './mcp-tool-registry.service';

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
    for (const tool of toolDefinitions) {
      server.tool(tool.name, tool.description, tool.schema, (args, extras) =>
        tool.handler(this.ctx, args, extras),
      );
    }

    return server;
  }
}
