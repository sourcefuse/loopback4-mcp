import {expect, sinon} from '@loopback/testlab';
import {describe, it, before, after} from 'mocha';
import http from 'http';
import {randomUUID} from 'crypto';
import {z} from 'zod';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

describe('Calculator Tool - Add Method (MCP Streamable HTTP)', () => {
  let httpServer: http.Server;
  let server: Server;
  let transport: StreamableHTTPServerTransport;
  let client: Client;
  let port: number;

  let addSpy: sinon.SinonSpy;

  before(async () => {
    server = new Server(
      {name: 'calculator-mcp-server', version: '1.0.0'},
      {capabilities: {tools: {}}},
    );

    addSpy = sinon.spy(async (args: {a: number; b: number}) => {
      const sum = args.a + args.b;
      return {
        content: [
          {
            type: 'text',
            text: `The sum of ${args.a} and ${args.b} is ${sum}`,
          },
        ],
      };
    });

    server.setRequestHandler(
      z.object({
        method: z.literal('tools/call'),
        params: z.object({
          name: z.literal('calculator_add'),
          arguments: z.object({
            a: z.number(),
            b: z.number(),
          }),
        }),
      }),
      async request => {
        return addSpy(request.params.arguments);
      },
    );

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    await server.connect(transport);

    httpServer = http.createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/mcp') {
        res.statusCode = 404;
        res.end();
        return;
      }

      let body = '';
      req.on('data', chunk => (body += chunk));
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      req.on('end', async () => {
        const message = JSON.parse(body);

        const response = await transport.handleRequest(req, res, message);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(response));
      });
    });

    await new Promise<void>(resolve => {
      httpServer.listen(0, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
    client = new Client(
      {name: 'calculator-test-client', version: '1.0.0'},
      {capabilities: {tools: {}}},
    );

    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`),
      ),
    );
  });

  after(async () => {
    sinon.restore();
    await client.close();
    await server.close();
    await new Promise(resolve => httpServer.close(resolve));
  });

  it('should call add method and return correct sum', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'calculator_add',
          arguments: {a: 5, b: 7},
        },
      },
      z.object({
        content: z.array(
          z.object({
            type: z.literal('text'),
            text: z.string(),
          }),
        ),
      }),
    );

    expect(result.content[0].text).to.equal('The sum of 5 and 7 is 12');

    sinon.assert.calledOnce(addSpy);
    sinon.assert.calledWithMatch(addSpy, {a: 5, b: 7});
  });
});
