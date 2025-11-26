import {BindingKey, Interceptor} from '@loopback/core';

export namespace McpBindings {
  export const ACCESS_INTERCEPTOR = BindingKey.create<Interceptor>(
    'mcp.access.interceptor',
  );
}
