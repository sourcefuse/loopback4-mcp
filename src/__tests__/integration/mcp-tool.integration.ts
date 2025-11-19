import {Context} from '@loopback/core';
import {expect, sinon} from '@loopback/testlab';
import {McpServerFactory} from '../../services/mcp-server-factory.service';
import {McpToolRegistry} from '../../services/mcp-tool-registry.service';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

describe('McpServerFactory (integration)', () => {
  let ctx: Context;
  let toolRegistry: McpToolRegistry;
  let factory: McpServerFactory;

  const mockTools = [
    {
      name: 'testTool',
      description: 'Test tool',
      schema: {type: 'object', properties: {}},
      handler: sinon.stub(),
    },
  ];

  beforeEach(() => {
    ctx = new Context();

    // stub registry
    toolRegistry = {
      getToolDefinitions: sinon.stub().returns(mockTools),
    } as unknown as McpToolRegistry;

    factory = new McpServerFactory(ctx, toolRegistry);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('registers tools on MCP server', () => {
    const toolSpy = sinon.spy(McpServer.prototype, 'tool');

    const server = factory.createServer();
    expect(server).to.be.instanceOf(McpServer);

    sinon.assert.calledOnce(toolSpy);
    sinon.assert.calledWithMatch(
      toolSpy,
      mockTools[0].name,
      mockTools[0].description,
      sinon.match(mockTools[0].schema),
      sinon.match.func,
    );
  });
});
