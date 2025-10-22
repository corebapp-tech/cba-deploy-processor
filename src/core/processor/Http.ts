export interface Request {
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  method?: string;
  path?: string;
}

export interface Response {
  statusCode: number;
  headers?: Record<string, string>;
  body: any;
}

export interface Context {
  log(message: string): void;
  logError(error: Error | string): void;
  logWarning(message: string): void;
}

export class ResponseBuilder {
  static create(statusCode: number, body: any, headers?: Record<string, string>): Response {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body
    };
  }

  static success(data: any, headers?: Record<string, string>): Response {
    return this.create(200, data, headers);
  }

  static error(message: string, statusCode: number = 500, headers?: Record<string, string>): Response {
    return this.create(statusCode, { error: message }, headers);
  }

  static badRequest(message: string): Response {
    return this.error(message, 400);
  }

  static notFound(message: string = 'Resource not found'): Response {
    return this.error(message, 404);
  }

  static unauthorized(message: string = 'Unauthorized'): Response {
    return this.error(message, 401);
  }
}