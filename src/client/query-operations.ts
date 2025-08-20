import { timeOperation } from '../utils/monitoring.js';
import { CoreLogseqClient } from './core-client.js';

/**
 * Query and search operations for Logseq API
 */
export class QueryOperations extends CoreLogseqClient {
  /**
   * Execute a DataScript query
   */
  async datascriptQuery(query: string): Promise<readonly unknown[]> {
    return timeOperation('logseq.query.datascript', async () => {
      return this.callApi<unknown[]>('logseq.DB.datascriptQuery', [query]);
    });
  }

  /**
   * Execute a simple query
   */
  async simpleQuery(query: string): Promise<readonly unknown[]> {
    return timeOperation('logseq.query.simple', async () => {
      return this.callApi<unknown[]>('logseq.DB.q', [query]);
    });
  }
}