export type CastType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'array';

export interface CastOptions {
  strict?: boolean;
  defaultValue?: any;
  allowNull?: boolean;
}

export interface CastResult<T> {
  success: boolean;
  value: T | null;
  error?: string;
}

export class InputCastingService {
  static toString(input: any, options: CastOptions = {}): CastResult<string> {
    try {
      if (input === null || input === undefined) {
        if (options.allowNull) {
          return { success: true, value: null };
        }
        if (options.defaultValue !== undefined) {
          return { success: true, value: String(options.defaultValue) };
        }
        return {
          success: false,
          value: null,
          error: 'Input is null or undefined',
        };
      }

      const result = String(input);
      return { success: true, value: result };
    } catch (error) {
      return {
        success: false,
        value: options.defaultValue || null,
        error: `Error converting to string: ${error}`,
      };
    }
  }

  static toNumber(input: any, options: CastOptions = {}): CastResult<number> {
    try {
      if (input === null || input === undefined) {
        if (options.allowNull) {
          return { success: true, value: null };
        }
        if (options.defaultValue !== undefined) {
          return { success: true, value: Number(options.defaultValue) };
        }
        return {
          success: false,
          value: null,
          error: 'Input is null or undefined',
        };
      }

      // For empty strings
      if (typeof input === 'string' && input.trim() === '') {
        if (options.defaultValue !== undefined) {
          return { success: true, value: Number(options.defaultValue) };
        }
        return {
          success: false,
          value: null,
          error: 'Empty string cannot be converted to number',
        };
      }

      const result = Number(input);

      if (isNaN(result)) {
        return {
          success: false,
          value: options.defaultValue || null,
          error: 'Value cannot be converted to valid number',
        };
      }

      if (
        options.strict &&
        typeof input !== 'number' &&
        typeof input !== 'string'
      ) {
        return {
          success: false,
          value: options.defaultValue || null,
          error: 'Strict mode: input must be number or string',
        };
      }

      return { success: true, value: result };
    } catch (error) {
      return {
        success: false,
        value: options.defaultValue || null,
        error: `Error converting to number: ${error}`,
      };
    }
  }

  static toInteger(input: any, options: CastOptions = {}): CastResult<number> {
    const numberResult = this.toNumber(input, options);

    if (!numberResult.success || numberResult.value === null) {
      return numberResult;
    }

    const intValue = Math.trunc(numberResult.value);
    return { success: true, value: intValue };
  }

  static toBoolean(input: any, options: CastOptions = {}): CastResult<boolean> {
    try {
      if (input === null || input === undefined) {
        if (options.allowNull) {
          return { success: true, value: null };
        }
        if (options.defaultValue !== undefined) {
          return { success: true, value: Boolean(options.defaultValue) };
        }
        return {
          success: false,
          value: null,
          error: 'Input is null or undefined',
        };
      }

      // Specific cases for strings
      if (typeof input === 'string') {
        const lowerInput = input.toLowerCase().trim();
        if (['true', '1', 'yes', 'da', 'on'].includes(lowerInput)) {
          return { success: true, value: true };
        }
        if (['false', '0', 'no', 'nu', 'off', ''].includes(lowerInput)) {
          return { success: true, value: false };
        }
      }

      // Standard cast
      const result = Boolean(input);
      return { success: true, value: result };
    } catch (error) {
      return {
        success: false,
        value: options.defaultValue || null,
        error: `Error converting to boolean: ${error}`,
      };
    }
  }

  static toDate(input: any, options: CastOptions = {}): CastResult<Date> {
    try {
      if (input === null || input === undefined) {
        if (options.allowNull) {
          return { success: true, value: null };
        }
        if (options.defaultValue !== undefined) {
          return { success: true, value: new Date(options.defaultValue) };
        }
        return {
          success: false,
          value: null,
          error: 'Input is null or undefined',
        };
      }

      let date: Date;

      if (input instanceof Date) {
        date = input;
      } else if (typeof input === 'string' || typeof input === 'number') {
        date = new Date(input);
      } else {
        return {
          success: false,
          value: options.defaultValue || null,
          error: 'Input cannot be converted to Date',
        };
      }

      if (isNaN(date.getTime())) {
        return {
          success: false,
          value: options.defaultValue || null,
          error: 'Resulting date is not valid',
        };
      }

      return { success: true, value: date };
    } catch (error) {
      return {
        success: false,
        value: options.defaultValue || null,
        error: `Error converting to Date: ${error}`,
      };
    }
  }

  static toArray<T>(
    input: any,
    itemCaster?: (item: any) => CastResult<T>,
    options: CastOptions = {}
  ): CastResult<T[]> {
    try {
      if (input === null || input === undefined) {
        if (options.allowNull) {
          return { success: true, value: null };
        }
        if (options.defaultValue !== undefined) {
          return { success: true, value: options.defaultValue };
        }
        return {
          success: false,
          value: null,
          error: 'Input is null or undefined',
        };
      }

      let array: any[];

      if (Array.isArray(input)) {
        array = input;
      } else if (typeof input === 'string') {
        try {
          // Try to parse JSON
          array = JSON.parse(input);
          if (!Array.isArray(array)) {
            // If not JSON array, split by comma
            array = input.split(',').map(item => item.trim());
          }
        } catch {
          // Split by comma as fallback
          array = input.split(',').map(item => item.trim());
        }
      } else {
        // Try to convert to array
        array = [input];
      }

      // Apply caster for each element if provided
      if (itemCaster) {
        const castResults: T[] = [];
        const errors: string[] = [];

        for (let i = 0; i < array.length; i++) {
          const result = itemCaster(array[i]);
          if (result.success && result.value !== null) {
            castResults.push(result.value);
          } else if (result.error) {
            errors.push(`Element ${i}: ${result.error}`);
          }
        }

        if (errors.length > 0 && options.strict) {
          return {
            success: false,
            value: options.defaultValue || null,
            error: `Casting errors: ${errors.join(', ')}`,
          };
        }

        return { success: true, value: castResults };
      }

      return { success: true, value: array };
    } catch (error) {
      return {
        success: false,
        value: options.defaultValue || null,
        error: `Error converting to array: ${error}`,
      };
    }
  }

  static cast<T>(
    input: any,
    type: CastType,
    options: CastOptions = {}
  ): CastResult<T> {
    switch (type) {
      case 'string':
        return this.toString(input, options) as CastResult<T>;
      case 'number':
        return this.toNumber(input, options) as CastResult<T>;
      case 'integer':
        return this.toInteger(input, options) as CastResult<T>;
      case 'boolean':
        return this.toBoolean(input, options) as CastResult<T>;
      case 'date':
        return this.toDate(input, options) as CastResult<T>;
      case 'array':
        return this.toArray(input, undefined, options) as CastResult<T>;
      default:
        return {
          success: false,
          value: null,
          error: `Unsupported type: ${type}`,
        } as CastResult<T>;
    }
  }

  static castObject<T extends Record<string, any>>(
    input: any,
    schema: Partial<{
      [K in keyof T]: {
        type: CastType;
        options?: CastOptions;
      };
    }>,
    options: { strict?: boolean } = {}
  ): CastResult<Partial<T>> {
    try {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          value: null,
          error: 'Input is not a valid object',
        };
      }
      const result: any = {};
      const errors: string[] = [];
      for (const [key, config] of Object.entries(schema) as Array<
        [
          keyof T,
          {
            type: CastType;
            options?: CastOptions;
          }
        ]
      >) {
        if (config) {
          const castResult = this.cast(
            input[key],
            config.type,
            config.options || {}
          );
          if (castResult.success) {
            result[key] = castResult.value;
          } else if (options.strict) {
            errors.push(`${String(key)}: ${castResult.error}`);
          } else {
            result[key] = castResult.value;
          }
        }
      }
      if (errors.length > 0 && options.strict) {
        return {
          success: false,
          value: null,
          error: `Casting errors: ${errors.join(', ')}`,
        };
      }
      return { success: true, value: result as Partial<T> };
    } catch (error) {
      return {
        success: false,
        value: null,
        error: `Error casting object: ${error}`,
      };
    }
  }
}
