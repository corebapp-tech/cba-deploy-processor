import { Context, Request } from '../../../processor/Http';

export class AzureRequestAdapter implements Request {
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  method?: string;
  path?: string;

  constructor(azureRequest: any) {
    this.body = azureRequest.body;
    this.query = azureRequest.query || {};
    this.headers = azureRequest.headers || {};
    this.pathParameters = azureRequest.params || {};
    this.method = azureRequest.method;
    this.path = azureRequest.url;
  }
}

export class AzureContextAdapter implements Context {
  constructor(private azureContext: any) {}

  log(message: string): void {
    this.azureContext.log(message);
  }

  logError(error: Error | string): void {
    this.azureContext.log.error(error);
  }

  logWarning(message: string): void {
    this.azureContext.log.warn(message);
  }
}
