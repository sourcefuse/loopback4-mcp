import {BindingKey, Context} from '@loopback/core';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import {ZodRawShape} from 'zod';
import {McpHookFunction} from './interfaces';

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
