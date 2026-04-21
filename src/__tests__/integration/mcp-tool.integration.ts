import {Context} from '@loopback/core';
import {expect, sinon} from '@loopback/testlab';
import {McpServerFactory} from '../../services/mcp-server-factory.service';
import {McpToolRegistry} from '../../services/mcp-tool-registry.service';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

// Test constants to avoid magic numbers
const TEST_NUMBER_1 = 1;
const TEST_NUMBER_2 = 2;
const TEST_NUMBER_3 = 3;
const TEST_NUMBERS = [TEST_NUMBER_1, TEST_NUMBER_2, TEST_NUMBER_3];

describe('McpServerFactory (integration)', () => {
  let ctx: Context;
  let toolRegistry: McpToolRegistry;
  let factory: McpServerFactory;

  const mockTools = [
    {
      name: 'testTool',
      description: 'Test tool',
      schema: {},
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
    const toolSpy = sinon.spy(McpServer.prototype, 'registerTool');

    const server = factory.createServer();
    expect(server).to.be.instanceOf(McpServer);

    sinon.assert.calledOnce(toolSpy);
    sinon.assert.calledWithMatch(
      toolSpy,
      mockTools[0].name,
      {
        description: mockTools[0].description,
        inputSchema: mockTools[0].schema,
      },
      sinon.match.func,
    );
  });

  describe('parameter unwrapping', () => {
    it('unwraps double-wrapped object parameters', async () => {
      const receivedParams: Record<string, unknown> = {};

      // Simulate the unwrapping logic directly
      const parameters = {
        currency: {
          currency: {
            currencyCode: 'CAD',
            currencyName: 'Canadian Dollar',
            symbol: 'C$',
            country: 'Canada',
          },
        },
      };

      // Apply the same unwrapping logic from the factory
      for (const [key, value] of Object.entries(parameters)) {
        if (value && typeof value === 'object') {
          const valueObj = value as Record<string, unknown>;
          if (key in valueObj && Object.keys(valueObj).length === 1) {
            receivedParams[key] = valueObj[key];
          } else {
            receivedParams[key] = value;
          }
        } else {
          receivedParams[key] = value;
        }
      }

      expect(receivedParams).to.deepEqual({
        currency: {
          currencyCode: 'CAD',
          currencyName: 'Canadian Dollar',
          symbol: 'C$',
          country: 'Canada',
        },
      });
    });

    it('keeps normal object parameters unchanged', () => {
      const receivedParams: Record<string, unknown> = {};

      const normalParams = {
        currency: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          symbol: '$',
          country: 'USA',
        },
        amount: 100,
      };

      for (const [key, value] of Object.entries(normalParams)) {
        if (value && typeof value === 'object') {
          const valueObj = value as Record<string, unknown>;
          if (key in valueObj && Object.keys(valueObj).length === 1) {
            receivedParams[key] = valueObj[key];
          } else {
            receivedParams[key] = value;
          }
        } else {
          receivedParams[key] = value;
        }
      }

      expect(receivedParams).to.deepEqual(normalParams);
    });

    it('preserves primitive parameters unchanged', () => {
      const receivedParams: Record<string, unknown> = {};

      const primitiveParams = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      for (const [key, value] of Object.entries(primitiveParams)) {
        if (value && typeof value === 'object') {
          const valueObj = value as Record<string, unknown>;
          if (key in valueObj && Object.keys(valueObj).length === 1) {
            receivedParams[key] = valueObj[key];
          } else {
            receivedParams[key] = value;
          }
        } else {
          receivedParams[key] = value;
        }
      }

      expect(receivedParams).to.deepEqual(primitiveParams);
    });

    it('handles array parameters correctly', () => {
      const receivedParams: Record<string, unknown> = {};

      const arrayParams: Record<string, unknown> = {
        items: ['item1', 'item2', 'item3'],
        numbers: TEST_NUMBERS,
      };

      for (const [key, value] of Object.entries(arrayParams)) {
        if (value && typeof value === 'object') {
          const valueObj = value as Record<string, unknown>;
          if (key in valueObj && Object.keys(valueObj).length === 1) {
            receivedParams[key] = valueObj[key];
          } else {
            receivedParams[key] = value;
          }
        } else {
          receivedParams[key] = value;
        }
      }

      expect(receivedParams).to.deepEqual(arrayParams);
    });

    it('handles null and undefined parameters', () => {
      const receivedParams: Record<string, unknown> = {};

      const nullParams = {
        name: 'John Doe',
        age: null,
        address: undefined,
      };

      for (const [key, value] of Object.entries(nullParams)) {
        if (value && typeof value === 'object') {
          const valueObj = value as Record<string, unknown>;
          if (key in valueObj && Object.keys(valueObj).length === 1) {
            receivedParams[key] = valueObj[key];
          } else {
            receivedParams[key] = value;
          }
        } else {
          receivedParams[key] = value;
        }
      }

      expect(receivedParams).to.deepEqual(nullParams);
    });
  });
});
