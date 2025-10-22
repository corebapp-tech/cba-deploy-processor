import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { AdapterFactory } from '../../adapters/AdapterFactory';

import { getProcessor } from '../loader';

export const httpRequestHandler: AzureFunction = async (
  context: Context,
  req: HttpRequest
) => {
  const azureContext = AdapterFactory.createContext('azure', context);
  const azureRequest = AdapterFactory.createRequest('azure', req);

  const processor = await getProcessor(
    process.env.DEPLOY_PROCESSOR as string,
    azureContext
  );
  const response = await processor.execute(azureRequest);

  context.res = {
    status: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
};
