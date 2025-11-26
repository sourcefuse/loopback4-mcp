import {
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {IAuthUserWithPermissions} from '@sourceloop/core';
import {AuthenticationBindings} from 'loopback4-authentication';

export class McpAccessInterceptor implements Provider<Interceptor> {
  constructor(
    @inject(AuthenticationBindings.CURRENT_USER)
    private readonly currentUser: IAuthUserWithPermissions,
  ) {}

  value() {
    return this.intercept.bind(this);
  }

  intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ): ValueOrPromise<InvocationResult> {
    if (!this.currentUser) {
      throw new HttpErrors.Unauthorized('User not authenticated');
    }
    return next();
  }
}
