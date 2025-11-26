import {
  Application,
  Component,
  CoreBindings,
  createBindingFromClass,
  inject,
} from '@loopback/core';
import {
  McpSchemaGeneratorService,
  McpServerFactory,
  McpToolRegistry,
} from './services';
import {McpController} from './controllers';
import {McpToolRegistryBootObserver} from './observers';
import {McpAccessInterceptor} from './interceptors';
import {McpBindings} from './keys';

export class McpComponent implements Component {
  services = [McpSchemaGeneratorService, McpServerFactory, McpToolRegistry];
  controllers = [McpController];
  lifeCycleObservers = [McpToolRegistryBootObserver];
  bindings = [
    createBindingFromClass(McpAccessInterceptor, {
      key: McpBindings.ACCESS_INTERCEPTOR,
    }),
  ];
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: Application,
  ) {}
}
