import { Context, Request } from '../../processor/Http';
import {
  AzureContextAdapter,
  AzureRequestAdapter,
} from './azure/AzureRequestAdapter';

export class AdapterFactory {
  static createContext(platform: 'azure', originalContext: any): Context {
    switch (platform) {
      case 'azure':
        return new AzureContextAdapter(originalContext);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static createRequest(platform: 'azure', originalRequest: any): Request {
    switch (platform) {
      case 'azure':
        return new AzureRequestAdapter(originalRequest);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
