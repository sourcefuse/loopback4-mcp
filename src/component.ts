import {Application, Component, CoreBindings, inject} from '@loopback/core';

export class McpComponent implements Component {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: Application,
  ) {}
}
