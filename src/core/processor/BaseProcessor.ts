import { ValidationError } from './Errors';
import { Context } from './Http';

export abstract class BaseProcessor {
  protected context: Context;
  protected startTime: number;

  constructor(context: Context) {
    this.context = context;
    this.startTime = Date.now();
  }

  private isValidRequiredValue(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
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

  protected throwValidationError(message: string): void {
    throw new ValidationError(message);
  }

  protected validateRequired(value: any, fieldName: string): void {
    if (!this.isValidRequiredValue(value)) {
      this.throwValidationError(`Missing required field: ${fieldName}`);
    }
  }
}
