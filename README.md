<a href="https://sourcefuse.github.io/arc-docs/arc-api-docs" target="_blank"><img src="https://github.com/sourcefuse/loopback4-microservice-catalog/blob/master/docs/assets/logo-dark-bg.png?raw=true" alt="ARC By SourceFuse logo" title="ARC By SourceFuse" align="right" width="150" /></a>

# [loopback4-mcp](https://github.com/sourcefuse/loopback4-mcp)

<p align="left">
<a href="https://www.npmjs.com/package/loopback4-mcp">
<img src="https://img.shields.io/npm/v/loopback4-mcp.svg" alt="npm version" />
</a>
<a href="https://sonarcloud.io/summary/new_code?id=sourcefuse_loopback4-mcp" target="_blank">
<img alt="Sonar Quality Gate" src="https://img.shields.io/sonar/quality_gate/sourcefuse_loopback4-mcp?server=https%3A%2F%2Fsonarcloud.io">
</a>
<a href="https://github.com/sourcefuse/loopback4-mcp/graphs/contributors" target="_blank">
<img alt="GitHub contributors" src="https://img.shields.io/github/contributors/sourcefuse/loopback4-mcp?">
</a>
<a href="https://www.npmjs.com/package/loopback4-mcp" target="_blank">
<img alt="downloads" src="https://img.shields.io/npm/dw/loopback4-mcp.svg">
</a>
<a href="./LICENSE">
<img src="https://img.shields.io/github/license/sourcefuse/loopback4-mcp.svg" alt="License" />
</a>
<a href="https://loopback.io/" target="_blank">
<img alt="Powered By LoopBack 4" src="https://img.shields.io/badge/Powered%20by-LoopBack 4-brightgreen" />
</a>
</p>

## Overview

This extension provides a plug-and-play integration between LoopBack4 applications and Model Context Protocol (MCP) specification. Its purpose is to enable LoopBack APIs, services, and business logic to be exposed as MCP Tools, allowing external MCP clients (such as LLMs, agents, or MCP-compatible apps) to discover and execute server-defined operations.

### Key Features

- **Automatic MCP Tool Discovery**: The extension scans your application at boot time and automatically registers all methods decorated with the custom `@mcpTool()` decorator. This allows you to define MCP tools anywhere in your LoopBack project without manually wiring metadata.

- **Lifecycle-managed Tool Registry**: A dedicated `McpToolRegistry` service maintains all discovered tool metadata, their handlers, and execution context. A `McpToolRegistryBootObserver` ensures that registration happens only after the application has fully booted.

- **Hook System Support**: Built-in support for pre and post hooks that enable validation, logging, audit trails, and custom business logic around tool execution.

- **Authorization Integration**: Seamless integration with LoopBack's authorization system, ensuring MCP tools respect your existing permission structure.

- **Simplified Endpoint Format**: Easy-to-use POST endpoint that accepts tool arguments directly without complex MCP protocol wrapping.

## Installation

```sh
npm install loopback4-mcp
```

## Integration Steps

### Step 1: Create Binding Keys

Create a `src/keys.ts` file to define binding keys for MCP hooks:

```typescript
import {BindingKey} from '@loopback/core';

export namespace McpHookBindings {
  export const PRE_HOOK = BindingKey.create<Function>('hooks.mcp.preHook');
  export const POST_HOOK = BindingKey.create<Function>('hooks.mcp.postHook');
}
```

### Step 2: Create Hook Providers

Create hook providers to implement pre and post-hook functionality:

```typescript
// src/providers/mcp-pre-hook.provider.ts
import {inject, Provider} from '@loopback/core';
import {McpHookContext} from 'loopback4-mcp';

export class McpPreHookProvider implements Provider<Function> {
  value(): Function {
    return async (context: McpHookContext) => {
      console.log(`Pre-hook executing for tool: ${context.toolName}`);
      // Add validation, sanitization, or pre-processing logic here
    };
  }
}

// src/providers/mcp-post-hook.provider.ts
export class McpPostHookProvider implements Provider<Function> {
  value(): Function {
    return async (context: McpHookContext) => {
      console.log(`Post-hook executing for tool: ${context.toolName}`);
      // Add logging, audit trails, or post-processing logic here
    };
  }
}
```

### Step 3: Configure Application

Update your `src/application.ts` to bind the component and hooks:

```typescript
import {BootMixin, ServiceMixin} from '@loopback/core';
import {RepositoryMixin, RestApplication} from '@loopback/rest';
import {McpComponent} from 'loopback4-mcp';
import {McpHookBindings} from './keys';
import {McpPreHookProvider} from './providers/mcp-pre-hook.provider';
import {McpPostHookProvider} from './providers/mcp-post-hook.provider';

export class MyApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Bind MCP component
    this.component(McpComponent);

    // Bind hook providers
    this.bind(McpHookBindings.PRE_HOOK).toProvider(McpPreHookProvider);
    this.bind(McpHookBindings.POST_HOOK).toProvider(McpPostHookProvider);
  }
}
```

### Step 4: Create MCP Tool Controllers

Add the `@mcpTool()` decorator to controller methods you want to expose as MCP tools. Here's a complete example showing the decorator stack with authorization and authentication:

```typescript
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {param, post, get, patch, put, del, requestBody} from '@loopback/rest';
import {authorize} from 'loopback4-authorization';
import {authenticate, STRATEGY} from 'loopback4-authentication';
import {PermissionKey} from '../permissions';
import {
  OPERATION_SECURITY_SPEC,
  STATUS_CODE,
  getModelSchemaRefSF,
} from '@sourceloop/core';
import {mcpTool} from 'loopback4-mcp';
import {HookBindings} from '../keys';
import {User, UserRepository} from '../models';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  @authorize({
    permissions: [PermissionKey.CreateUser],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @mcpTool({
    name: 'createUser',
    description: 'Create a new user in the system',
    preHook: {binding: HookBindings.PRE_HOOK},
    postHook: {binding: HookBindings.POST_HOOK},
  })
  @post('/users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.OK]: {
        description: 'User model instance',
        content: {
          'application/json': {schema: getModelSchemaRefSF(User)},
        },
      },
    },
  })
  async create(
    @param.query.object('user') user: Omit<User, 'id'>,
  ): Promise<object> {
    const created = await this.userRepository.create(user as User);

    return {
      content: [{
        type: 'text',
        text: `Successfully created user with id: ${created.id}`
      }]
    };
  }

  @authorize({
    permissions: [PermissionKey.ViewUser],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @mcpTool({
    name: 'getUserById',
    description: 'Get a user by ID',
    preHook: {binding: HookBindings.PRE_HOOK},
    postHook: {binding: HookBindings.POST_HOOK},
  })
  @get('/users/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.OK]: {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRefSF(User, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<User> {
    return this.userRepository.findById(id);
  }

  @authorize({
    permissions: [PermissionKey.ViewUser],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @mcpTool({
    name: 'listUsers',
    description: 'List all users',
    preHook: {binding: HookBindings.PRE_HOOK},
    postHook: {binding: HookBindings.POST_HOOK},
  })
  @get('/users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.OK]: {
        description: 'Array of User model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRefSF(User, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.filter(User) filter?: Filter<User>,
  ): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  @authorize({
    permissions: [PermissionKey.UpdateUser],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @mcpTool({
    name: 'updateUserById',
    description: 'Update a user by ID',
    preHook: {binding: HookBindings.PRE_HOOK},
    postHook: {binding: HookBindings.POST_HOOK},
  })
  @patch('/users/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.NO_CONTENT]: {
        description: 'User PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @param.query.object('user') user: User,
  ): Promise<object> {
    await this.userRepository.updateById(id, user);

    return {
      content: [{
        type: 'text',
        text: `Successfully updated user with id: ${id}`
      }]
    };
  }

  @authorize({
    permissions: [PermissionKey.DeleteUser],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @mcpTool({
    name: 'deleteUser',
    description: 'Delete a user by ID',
    preHook: {binding: HookBindings.PRE_HOOK},
    postHook: {binding: HookBindings.POST_HOOK},
  })
  @del('/users/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.NO_CONTENT]: {
        description: 'User DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<object> {
    // Verify user exists first (will throw 404 if not found)
    await this.userRepository.findById(id);

    await this.userRepository.deleteById(id);

    return {
      content: [{
        type: 'text',
        text: `Successfully deleted user with id: ${id}`
      }]
    };
  }
}
```

## Component Interaction Flow

**Request Flow:**
```
Client Request (POST /mcp?tool=toolName)
                    ↓
McpController receives request and creates MCP server
                    ↓
McpServerFactory generates per-request server instance
                    ↓
McpToolRegistry looks up tool by name
                    ↓
Authorization Check validates JWT and permissions
                    ↓
Pre-Hook (if configured) performs validation/sanitization
                    ↓
Controller Method executes business logic
                    ↓
Post-Hook (if configured) performs logging/audit trails
                    ↓
Response Formatting wraps result in MCP format
                    ↓
Client receives MCP-formatted response
```

**Error Flow:**
```
Authorization Check Failed → 403 Forbidden Response → Client receives error
Controller Method Error → Error Formatting → Client receives MCP-formatted error
Hook Execution Error → Error Handling → Client receives MCP-formatted error
```

## MCP Endpoint Usage

### Endpoint Format

**POST** `/mcp?tool=toolName`

**Required Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_JWT_TOKEN`

### Example Request

```bash
curl -X POST http://localhost:3000/mcp?tool=create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user": {
      "email": "john@example.com",
      "name": "John Doe",
      "age": 30
    }
  }'
```

### Example Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "User created with ID: 550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

## Parameter Decorator Guidelines

**Critical:** Use correct LoopBack `@param` decorators based on your route structure.

### Path Parameters
```typescript
@get('/users/{id}')
async findById(
  @param.path.string('id') id: string,  // ✅ Correct for /users/{id}
): Promise<User> {
  return this.userRepository.findById(id);
}
```

### Query Parameters
```typescript
@get('/users')
async findAll(
  @param.query.string('name') name?: string,  // ✅ Correct for /users?name=value
): Promise<User[]> {
  return this.userRepository.find({where: {name}});
}
```

### Request Body Parameters
```typescript
@post('/users')
async create(
  @param.request.body('user') user: User,  // ✅ Correct for POST body
): Promise<User> {
  return this.userRepository.create(user);
}
```

**Common Mistakes:**
- ❌ Using `@param.query.string('id')` for `/users/{id}` routes
- ✅ Use `@param.path.string('id')` for path parameters

## Decorator Configuration

The `@mcpTool()` decorator accepts the following configuration:

```typescript
@mcpTool({
  // Required fields
  name: 'tool-name',              // Unique identifier for the tool
  description: 'Tool description',  // Human-readable description

  // Optional fields
  schema: {                         // Zod validation schema
    email: z.string().email(),
    age: z.number().min(18),
  },
  preHookBinding: BindingKey.create('hooks.pre'),  // Pre-hook binding key
  postHookBinding: BindingKey.create('hooks.post'), // Post-hook binding key
})
```

## Testing

### Using MCP Inspector

The easiest way to test and visualize your MCP tools is using the MCP Inspector. This provides a web interface where all your endpoints are available and you can see hook responses in real-time.

**Start MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

**What MCP Inspector shows:**
- **All Available Tools**: Complete list of MCP tools exposed by your application
- **Tool Details**: Names, descriptions, and parameter schemas
- **Live Testing**: Test each tool directly from the web interface
- **Request/Response**: Real-time request and response data
- **Hook Execution**: Visualize pre and post-hook execution and their responses
- **Error Handling**: See error messages and debugging information

**Workflow with MCP Inspector:**
1. Start your LoopBack application
2. Run MCP Inspector with your MCP endpoint URL
3. Browse available tools in the web interface
4. Test tools with different parameters
5. Monitor hook execution and responses
6. Debug issues using the detailed logs

## Troubleshooting

### Common Issues

**Parameter extraction failures**
- **Cause:** Missing or incorrect `@param` decorators
- **Solution:** Ensure all parameters have appropriate decorators based on route structure

**"Invalid tools/call result: expected object, received undefined"**
- **Cause:** Method returns `void` instead of object
- **Solution:** Always return explicit MCP-formatted response for non-read operations

**Hook not executing**
- **Cause:** Hook not bound in application.ts or binding key mismatch
- **Solution:** Verify hook providers are bound and binding keys match decorator configuration

**Authorization failures**
- **Cause:** Missing `@authorize()` decorator or invalid JWT token
- **Solution:** Add appropriate authorization decorators and ensure valid authentication

## Best Practices

1. **Always use `@param` decorators** - MCP tool will fail without them
2. **Return MCP-formatted responses** for write operations (CREATE, UPDATE, DELETE)
3. **Implement proper error handling** in controller methods and hooks
4. **Use hooks for cross-cutting concerns** - validation, logging, audit trails
5. **Test with curl first** before integrating with MCP clients
6. **Monitor hook execution time** - hooks should be fast and non-blocking
7. **Keep controller methods focused** - move complex logic to services
8. **Use descriptive tool names** and detailed descriptions for better discovery

## Advanced Features

### Zod Schema Validation

Add input validation using Zod schemas:

```typescript
import {z} from 'zod';

@mcpTool({
  name: 'create-user',
  description: 'Create a new user',
  schema: {
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    age: z.number().min(18, 'User must be 18 or older'),
  },
})
```

### Custom Hook Implementations

Create more sophisticated hooks for business logic:

```typescript
export class ValidationHookProvider implements Provider<Function> {
  value(): Function {
    return async (context: McpHookContext) => {
      if (context.toolName === 'create-user') {
        const user = context.args.user as any;

        // Validate email uniqueness
        const existing = await this.userRepository.findOne({
          where: {email: user.email}
        });

        if (existing) {
          throw new Error('User with this email already exists');
        }

        // Sanitize input
        user.name = user.name.trim();
        user.email = user.email.toLowerCase();
      }
    };
  }
}
```

## Complete Example

For a complete working example, refer to the test suite in `src/__tests__/` which demonstrates:

- Controller setup with `@mcpTool` decorators
- Hook provider implementations
- Integration with authorization system
- Request/response handling
- Error management

## License

[MIT](./LICENSE)

## Support

- GitHub Issues: [sourcefuse/loopback4-mcp/issues](https://github.com/sourcefuse/loopback4-mcp/issues)
- Documentation: [loopback.io](https://loopback.io/)
