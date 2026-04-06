import { ValidationError } from './Errors';
import { Context } from './Http';
import { BaseProcessor } from './BaseProcessor';

export abstract class BaseQueueProcessor<
  Message = unknown,
> extends BaseProcessor {
  constructor(context: Context) {
    super(context);
  }

  protected validateMessageRequired(message: Message): void {
    if (message === undefined || message === null) {
      throw new ValidationError('Queue message is required');
    }
  }

  protected validateMessageFieldRequired(
    message: Message,
    fieldName: keyof Message
  ): void {
    const value = message[fieldName];
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(
        `Message field "${String(fieldName)}" is required`
      );
    }
  }

  abstract process(message: Message): Promise<void>;
  abstract validateInput(message: Message): Promise<void>;

  async execute(message: Message): Promise<void> {
    try {
      await this.validateInput(message);
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        this.logWarning(
          `Invalid message discarded after ${Date.now() - this.startTime}ms: ${error.message}`
        );
        this.logWarning(
          `Discarded message payload: ${JSON.stringify(message)}`
        );
        return;
      }
      this.logError(
        `Unexpected error in validateInput: ${error.message || error}`
      );
      throw error;
    }

    try {
      this.logInfo(`Processing started for ${this.constructor.name}`);
      await this.process(message);
      const duration = Date.now() - this.startTime;
      this.logInfo(`Processing completed successfully in ${duration}ms`);
    } catch (error: any) {
      const duration = Date.now() - this.startTime;
      this.logError(
        `Processing failed after ${duration}ms: ${error.message || error}`
      );
      throw error;
    }
  }
}
