import { ValidationError } from './Errors';
import { Context, ResponseBuilder, Response, Request } from './Http';
import { BaseProcessor } from './BaseProcessor';

export abstract class BaseHttpProcessor extends BaseProcessor {
  constructor(context: Context) {
    super(context);
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

  protected validateRequestBodyRequired(request: Request): void {
    if (!request.body) {
      throw new ValidationError(`Request body is required`);
    }
  }

  protected validateRequestQueryParamRequired(
    request: Request,
    queryParamName: string
  ): void {
    const queryParams = request.query as any;
    if (
      queryParams[queryParamName] === undefined ||
      queryParams[queryParamName] === null ||
      queryParams[queryParamName] === ''
    ) {
      throw new ValidationError(
        `Request query param: ${queryParamName} is required`
      );
    }
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
