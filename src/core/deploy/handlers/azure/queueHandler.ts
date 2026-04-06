import { AzureFunction, Context } from '@azure/functions';
import { AdapterFactory } from '../../adapters/AdapterFactory';

import { getProcessor } from '../loader';
import { BaseQueueProcessor } from '../../../processor/BaseQueueProcessor';

const queueHandler: AzureFunction = async function (
  context: Context,
  queueMessage: unknown
): Promise<void> {
  const azureContext = AdapterFactory.createContext('azure', context);

  const processor = (await getProcessor(
    process.env.DEPLOY_PROCESSOR as string,
    azureContext
  )) as BaseQueueProcessor;

  const message =
    typeof queueMessage === 'string' ? JSON.parse(queueMessage) : queueMessage;

  await processor.execute(message);
};

export { queueHandler };
