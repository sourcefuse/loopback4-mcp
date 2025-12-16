import {BindingKey, Context} from '@loopback/core';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import * as z from 'zod';
import {McpHookFunction} from './interfaces';
const objectSchema = z.object({});
export type McpToolHandler = (
  ctx: Context,
  args: {[key: string]: unknown},
  extras: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => CallToolResult | Promise<CallToolResult>;

export interface McpTool {
  name: string;
  description: string;
  schema: z.ZodRawShape;
  handler: McpToolHandler;
}

export interface McpHookConfig {
  binding: BindingKey<McpHookFunction> | string;
  config?: {[key: string]: unknown};
}

export interface McpToolMetadata {
  name: string;
  description: string;
  schema: z.ZodRawShape;
  controllerFunction: Function;
  preHook?: McpHookConfig;
  postHook?: McpHookConfig;
  parameterNames?: string[]; // Populated from LoopBack metadata
  controllerBinding?: BindingKey<object>;
}

export interface McpToolDecoratorOptions {
  name: string;
  description: string;
  schema?: z.ZodRawShape;
  preHook?: McpHookConfig;
  postHook?: McpHookConfig;
}
export function isTextMessage(
  message: z.infer<typeof objectSchema>,
): message is {
  content: Array<{type: 'text'; text: string}>;
  isError?: boolean;
} {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (message as any).content[0].type === 'text' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (message as any).content[0].text === 'string'
  );
}
