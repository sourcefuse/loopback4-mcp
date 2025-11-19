<a href="https://sourcefuse.github.io/arc-docs/arc-api-docs" target="_blank"><img src="https://github.com/sourcefuse/loopback4-microservice-catalog/blob/master/docs/assets/logo-dark-bg.png?raw=true" alt="ARC By SourceFuse logo" title="ARC By SourceFuse" align="right" width="150" /></a>
# [loopback4-mcp](https://github.com/sourcefuse/loopback4-mcp)
<p align="left">
</a>
<a href="https://loopback.io/" target="_blank">
<img alt="Powered By LoopBack 4" src="https://img.shields.io/badge/Powered%20by-LoopBack 4-brightgreen" />
</a>
</p>

## Overview

This extension provides a plug-and-play integration between LoopBack4 applications and the Model Context Protocol (MCP) specification.

Its purpose is to enable LoopBack APIs, services, and business logic to be exposed as MCP Tools, allowing external MCP clients (such as LLMs, agents, or MCP-compatible apps) to discover and execute server-defined operations.
### Key Features
- Automatic MCP Tool Discovery :-
  The extension scans your application at boot time and automatically registers all methods decorated with the custom @mcpTool() decorator.

  This allows you to define MCP tools anywhere in your LoopBack project without manually wiring metadata.

- Lifecycle-managed Tool Registry :-
  A dedicated `McpToolRegistry` service maintains all discovered tool metadata,their handlers and execution context.
  
  A `McpToolRegistryBootObserver` ensures that registration happens only after the application has fully booted.
## Installation
```sh
npm install loopback4-mcp
```
Then register the component inside your `application.ts`.
```ts
this.component(McpComponent);
```
## Usage
Add the `@mcpTool()` decorator to any controller in your application.
```ts
@mcpTool({
  name: 'create-user',
  description: 'Creates a new user in the system',
  schema?: {
    email: z.string().email(),
    name: z.string(),
  },
})
async createUser(args: {email: string; name: string}) {
  return {message: `User ${args.name} created`};
}
```
### Mcp Hook Usage Details
  To use hooks with MCP tools, follow the provider-based approach:
  Step 1: Create a hook provider:
  ```typescript
  // src/providers/my-hook.provider.ts
  export class MyHookProvider implements Provider<McpHookFunction> {
    constructor(@inject(LOGGER.LOGGER_INJECT) private logger: ILogger) {}
    value(): McpHookFunction {
      return async (context: McpHookContext) => {
        this.logger.info(`Hook executed for tool: ${context.toolName}`);
      };
    }
 }
  ```
  Step 2: Add binding key to McpHookBindings:
  ```typescript
  // src/keys.ts
  export namespace McpHookBindings {
    export const MY_HOOK = BindingKey.create<McpHookFunction>('hooks.mcp.myHook');
  }
  ```
  Step 3: Bind provider in `application.ts`:
  ```typescript
  this.bind(McpHookBindings.MY_HOOK).toProvider(MyHookProvider);
 ```
  Step 4: Use in decorator:
  ```typescript
  @mcpTool({
   name: 'my-tool',
   description: 'my-description'
   preHookBinding: McpHookBindings.MY_HOOK,
    postHookBinding: 'hooks.mcp.myOtherHook' // or string binding key
  })
