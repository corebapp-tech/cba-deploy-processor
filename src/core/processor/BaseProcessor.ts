import { ValidationError } from './Errors';
import { Context, ResponseBuilder, Response, Request } from './Http';

export abstract class BaseProcessor {
  protected context: Context;
  protected startTime: number;

  private isValidRequiredValue(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  protected handleError(error: any): Response {
    const duration = Date.now() - this.startTime;

    if (error.name === 'ValidationError') {
      this.logWarning(`Validation error after ${duration}ms: ${error.message}`);
      return ResponseBuilder.badRequest(error.message);
    }

    if (error.statusCode && error.statusCode < 500) {
      this.logWarning(`Client error after ${duration}ms: ${error.message}`);
      return ResponseBuilder.error(error.message, error.statusCode);
    }

    this.logError(
      `Server error after ${duration}ms: ${error.message || error}`
    );

    return ResponseBuilder.error('Internal server error');
  }

  protected logInfo(message: string): void {
    this.context.log(`[${this.constructor.name}] ${message}`);
  }

  protected logError(error: Error | string): void {
    this.context.logError(`[${this.constructor.name}] ${error}`);
  }

  protected logWarning(message: string): void {
    this.context.logWarning(`[${this.constructor.name}] ${message}`);
  }

  protected validateRequired(value: any, fieldName: string): void {
    if (this.isValidRequiredValue(value) === false) {
      throw new ValidationError(`${fieldName} is required`);
    }
  }

  protected validateRequestBodyRequired(request: Request): void {
    if (this.isValidRequiredValue(request.body) === false) {
      throw new ValidationError(`Request body is required`);
    }
  }

  protected validateRequestQueryParamRequired(
    request: Request,
    queryParamName: string
  ): void {
    const queryParams = request.query as any;
    if (this.isValidRequiredValue(queryParams['record_id']) === false) {
      throw new ValidationError(
        `Request query param: ${queryParamName} is required`
      );
    }
  }

  constructor(context: Context) {
    this.context = context;
    this.startTime = Date.now();
  }

  abstract process(request: Request): Promise<Response>;

  abstract validateInput(request: Request): Promise<void>;

  async execute(request: Request): Promise<Response> {
    try {
      this.logInfo(`Processing started for ${this.constructor.name}`);
      this.logInfo(`Request method: ${request.method}, path: ${request.path}`);

      await this.validateInput(request);

      const result = await this.process(request);
      const duration = Date.now() - this.startTime;
      this.logInfo(`Processing completed successfully in ${duration}ms`);

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }
}
