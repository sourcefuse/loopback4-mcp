import {BindingKey, Context} from '@loopback/core';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import {ZodRawShape} from 'zod';
import {McpHookFunction} from './interfaces';

/**
 * MCP Tool Hook Usage Guide:
 *
 * To use hooks with MCP tools, follow the provider-based approach:
 *
 * Step 1: Create a hook provider:
 * ```typescript
 * // src/providers/my-hook.provider.ts
 * export class MyHookProvider implements Provider<McpHookFunction> {
 *   constructor(@inject(LOGGER.LOGGER_INJECT) private logger: ILogger) {}
 *
 *   value(): McpHookFunction {
 *     return async (context: McpHookContext) => {
 *       this.logger.info(`Hook executed for tool: ${context.toolName}`);
 *     };
 *   }
 * }
 * ```
 *
 * Step 2: Add binding key to McpHookBindings:
 * ```typescript
 * // src/keys.ts
 * export namespace McpHookBindings {
 *   export const MY_HOOK = BindingKey.create<McpHookFunction>('hooks.mcp.myHook');
 * }
 * ```
 *
 * Step 3: Bind provider in application.ts:
 * ```typescript
 * this.bind(McpHookBindings.MY_HOOK).toProvider(MyHookProvider);
 * ```
 *
 * Step 4: Use in decorator:
 * ```typescript
 * @mcpTool({
 *   name: 'my-tool',
 *   preHookBinding: McpHookBindings.MY_HOOK,
 *   postHookBinding: 'hooks.mcp.myOtherHook' // or string binding key
 * })
 * ```
 */

export type McpToolHandler = (
  ctx: Context,
  args: {[key: string]: unknown},
  extras: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => CallToolResult | Promise<CallToolResult>;

export interface McpTool {
  name: string;
  description: string;
  schema: ZodRawShape;
  handler: McpToolHandler;
}

export interface McpHookConfig {
  binding: BindingKey<McpHookFunction> | string;
  config?: {[key: string]: unknown};
}

export interface McpToolMetadata {
  name: string;
  description: string;
  schema: ZodRawShape;
  controllerFunction: Function;
  preHook?: McpHookConfig;
  postHook?: McpHookConfig;
  parameterNames?: string[]; // Populated from LoopBack metadata
  controllerBinding?: BindingKey<object>;
}

export interface McpToolDecoratorOptions {
  name: string;
  description: string;
  schema?: ZodRawShape;
  preHook?: McpHookConfig;
  postHook?: McpHookConfig;
}
