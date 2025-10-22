import { BaseProcessor } from '../../processor/BaseProcessor';
import { Context } from '../../processor/Http';

interface BaseProcessorConstructor {
  new (context: Context): BaseProcessor;
}

export async function loadProcessorClass(
  processorName: string
): Promise<BaseProcessorConstructor> {
  try {
    const module = await import(`../../../processor/${processorName}/src/main`);
    return module.processor as BaseProcessorConstructor;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Cannot resolve module')
    ) {
      throw new Error(
        `Processor not found: src/processor/${processorName}/src/main.ts`
      );
    }
    throw new Error(`Failed to load processor ${processorName}: ${error}`);
  }
}

export async function getProcessor(
  name: string,
  context: Context
): Promise<BaseProcessor> {
  try {
    const processorClass = await loadProcessorClass(name);
    const processorInstance = new processorClass(context);
    return processorInstance;
  } catch (error) {
    console.error(`Error loading processor "${name}":`, error);
    throw error;
  }
}
