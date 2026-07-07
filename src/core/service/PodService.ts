import {
  FormDataField,
  httpGetFileMimeType,
  HttpHeaders,
  HttpParams,
  HttpResponse,
  HttpService,
} from './HttpService';

const DEFAULT_DOMAIN = 'coreb.app';

type FilterOperator = '$eq' | '$neq' | '$text';
type SortOrder = 'asc' | 'desc';
interface FilterCondition {
  operator: FilterOperator;
  value: string | number | boolean;
}
interface Filters {
  [field: string]: [FilterOperator, string | number | boolean][];
}
interface Sort {
  [field: string]: SortOrder;
}
interface Paginate {
  items: number;
  page: number;
}
export interface PodCriteria {
  filters?: Filters;
  fields?: string[];
  sort?: Sort;
  paginate?: Paginate;
}

export interface PodJsonExposeRawResponse<T = Record<string, any>> {
  success: {
    response: {
      rows: T[];
      count_rows: number;
    };
  };
}

export interface PodPullResult<T = Record<string, any>> {
  rows: T[];
  countRows: number;
}

/**
 * Criteria for stream (STREAM expose POD) pull requests.
 * Accepts either a direct record id or a flat list of filter conditions.
 * The two options are mutually exclusive — if recordId is provided, filters are ignored.
 */
export type PodStreamCriteria =
  | { recordId: string; filters?: never }
  | {
      recordId?: never;
      filters: Array<{
        [field: string]: [FilterOperator, string | number | boolean];
      }>;
    };

export interface PodPushData {
  [key: string]: any;
}
export type PodPushDataFile = FormDataField;
export interface PodAuth {
  type: 'queryKey' | 'bearerToken';
  value: string;
}
export interface PodUrlData {
  namespace: string;
  domain?: string;
}

// ─── PodCriteriaBuilder ────────────────────────────────────────────────────────

export class PodCriteriaBuilder {
  private criteria: PodCriteria = {};

  addFilter(
    field: string,
    operator: FilterOperator,
    value: string | number | boolean
  ): this {
    if (!this.criteria.filters) {
      this.criteria.filters = {};
    }
    if (!this.criteria.filters[field]) {
      this.criteria.filters[field] = [];
    }
    this.criteria.filters[field].push([operator, value]);
    return this;
  }

  addMultipleFilters(field: string, conditions: FilterCondition[]): this {
    conditions.forEach(condition => {
      this.addFilter(field, condition.operator, condition.value);
    });
    return this;
  }

  setFields(fields: string[]): this {
    this.criteria.fields = fields;
    return this;
  }

  addField(field: string): this {
    if (!this.criteria.fields) {
      this.criteria.fields = [];
    }
    if (!this.criteria.fields.includes(field)) {
      this.criteria.fields.push(field);
    }
    return this;
  }

  setSort(field: string, order: SortOrder): this {
    if (!this.criteria.sort) {
      this.criteria.sort = {};
    }
    this.criteria.sort[field] = order;
    return this;
  }

  addSort(field: string, order: SortOrder): this {
    return this.setSort(field, order);
  }

  setPagination(items: number, page: number): this {
    this.criteria.paginate = { items, page };
    return this;
  }

  reset(): this {
    this.criteria = {};
    return this;
  }

  build(): PodCriteria {
    return JSON.parse(JSON.stringify(this.criteria));
  }

  toJSON(): string {
    return JSON.stringify(this.criteria);
  }
}

// ─── PodCriteriaService ────────────────────────────────────────────────────────

export class PodCriteriaService {
  private builder: PodCriteriaBuilder;

  constructor() {
    this.builder = new PodCriteriaBuilder();
  }

  createCriteria(): PodCriteriaBuilder {
    return new PodCriteriaBuilder();
  }

  createSimpleCriteria(config: {
    filters?: { field: string; operator: FilterOperator; value: any }[];
    fields?: string[];
    sort?: { field: string; order: SortOrder };
    pagination?: { items: number; page: number };
  }): PodCriteria {
    const builder = new PodCriteriaBuilder();
    if (config.filters) {
      config.filters.forEach(filter => {
        builder.addFilter(filter.field, filter.operator, filter.value);
      });
    }
    if (config.fields) {
      builder.setFields(config.fields);
    }
    if (config.sort) {
      builder.setSort(config.sort.field, config.sort.order);
    }
    if (config.pagination) {
      builder.setPagination(config.pagination.items, config.pagination.page);
    }
    return builder.build();
  }

  static isValidOperator(operator: string): operator is FilterOperator {
    return ['$eq', '$neq', '$text'].includes(operator);
  }

  static isValidSortOrder(order: string): order is SortOrder {
    return ['asc', 'desc'].includes(order);
  }

  parseCriteria(criteriaJson: string): PodCriteria | null {
    try {
      const parsed = JSON.parse(criteriaJson);
      if (parsed.filters) {
        for (const [field, conditions] of Object.entries(parsed.filters)) {
          if (!Array.isArray(conditions)) {
            return null;
          }
          for (const condition of conditions as any[]) {
            if (!Array.isArray(condition) || condition.length !== 2) {
              return null;
            }
            if (!PodCriteriaService.isValidOperator(condition[0])) {
              return null;
            }
          }
        }
      }
      if (parsed.sort) {
        for (const [field, order] of Object.entries(parsed.sort)) {
          if (!PodCriteriaService.isValidSortOrder(order as string))
            return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

// ─── PodService ────────────────────────────────────────────────────────────────

export class PodService {
  private id: string;
  private httpService: HttpService;
  private defaultRequestParams: HttpParams = {};
  private defaultRequestHeaders: HttpHeaders = {};

  constructor(podId: string, url: PodUrlData, auth: PodAuth) {
    this.id = podId;
    const domain = url.domain ?? DEFAULT_DOMAIN;
    const baseUrl: string = `https://service.${url.namespace}.${domain}`;

    switch (auth.type) {
      case 'queryKey':
        this.defaultRequestParams['key'] = auth.value;
        break;
      case 'bearerToken':
        this.defaultRequestHeaders['Authorization'] = `Bearer ${auth.value}`;
        break;
    }

    const cloudflareInternalToken =
      process.env.DEPLOY_POD_CLOUDFLARE_INTERNAL_TOKEN;
    if (cloudflareInternalToken) {
      this.defaultRequestHeaders['X-Internal-Token'] = cloudflareInternalToken;
    }

    this.httpService = new HttpService(baseUrl);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getAffectedRecordCriteria(
    filters: { field: string; operator: FilterOperator; value: any }[]
  ): string {
    const builder = new PodCriteriaService().createCriteria();
    filters.forEach(filter => {
      builder.addFilter(filter.field, filter.operator, filter.value);
    });
    return `(${builder.toJSON()})`;
  }

  getPushDataFile(content: string, filename: string): PodPushDataFile {
    const dotParts = filename.lastIndexOf('.');
    const extension = filename.slice(dotParts);
    return {
      filename: filename,
      value: new Blob([content], { type: httpGetFileMimeType(extension) }),
    };
  }

  // ── Push ─────────────────────────────────────────────────────────────────────

  /**
   * Pushes data to a Push-Inbound POD in Corebapp.
   * @param affectedRecord  Optional record id for update operations ($record_id query param).
   * @param data            Key-value payload sent as form-data.
   */
  push(
    affectedRecord: string | null = null,
    data: PodPushData
  ): Promise<HttpResponse<any>> {
    return this.httpService.post(`/v1/external/pod/${this.id}`, data, {
      params: {
        ...this.defaultRequestParams,
        ...(affectedRecord ? { $record_id: affectedRecord } : {}),
      },
      headers: this.defaultRequestHeaders,
      contentType: 'form-data',
    });
  }

  // ── Pull (JSON) ───────────────────────────────────────────────────────────────

  /**
   * Pulls data from a JSON Expose POD in Corebapp and unwraps the response.
   *
   * The raw response shape is:
   * { success: { response: { rows: T[], count_rows: number } } }
   *
   * This method returns the unwrapped { rows, countRows } directly.
   *
   * @param criteria  Optional filters, field projection, sort and pagination.
   *                  - filters:  { field: [[operator, value], ...] }
   *                  - fields:   string[] — restrict returned fields
   *                  - sort:     { field: 'asc' | 'desc' }
   *                  - paginate: { items: number, page: number }
   *
   * @example
   *   const { rows, countRows } = await podService.pull<Country>({
   *     filters: { status: [['$eq', 'active']] },
   *     sort:    { name: 'asc' },
   *     paginate: { items: 50, page: 1 },
   *   });
   */
  async pull<T = Record<string, any>>(
    criteria?: PodCriteria
  ): Promise<PodPullResult<T>> {
    const params: HttpParams = { ...this.defaultRequestParams };
    if (criteria && Object.keys(criteria).length > 0) {
      params['$criteria'] = JSON.stringify(criteria);
    }

    const response = await this.httpService.get<PodJsonExposeRawResponse<T>>(
      `/v1/external/pod/${this.id}`,
      {
        params,
        headers: this.defaultRequestHeaders,
      }
    );

    const data = response.data;
    if (!data?.success?.response) {
      throw new Error(
        `PodService.pull: unexpected response shape from POD "${this.id}". ` +
          `Expected { success: { response: { rows, count_rows } } }, got: ${JSON.stringify(data)}`
      );
    }

    return {
      rows: data.success.response.rows,
      countRows: data.success.response.count_rows,
    };
  }

  // ── Pull (Stream) ─────────────────────────────────────────────────────────────

  /**
   * Pulls a binary file from a STREAM Expose POD in Corebapp.
   * Use when the Expose POD has response_type "stream" (file_upload field).
   *
   * Accepts either a direct record id OR a filter criteria to locate the record.
   * The two forms are mutually exclusive — provide one, not both.
   *
   * @param options
   *   - `recordId`  — direct record id; sent as `$record_id=<id>` query param.
   *   - `filters`   — flat array of { field: [operator, value] } objects; sent as
   *                   `$criteria_object={"filters":[...]}`. Use when the record id
   *                   is unknown but you can identify the record by a field value.
   *
   * @example — by record id
   *   const file = await podService.pullStream({ recordId: '469984300-abc' });
   *
   * @example — by filter
   *   const file = await podService.pullStream({
   *     filters: [{ invoice_number: ['$eq', 'INV-2024-001'] }],
   *   });
   */
  pullStream(options: PodStreamCriteria): Promise<HttpResponse<Blob>> {
    const params: HttpParams = { ...this.defaultRequestParams };

    if ('recordId' in options && options.recordId) {
      params['$record_id'] = options.recordId;
    } else if ('filters' in options && options.filters) {
      params['$criteria_object'] = JSON.stringify({ filters: options.filters });
    }

    return this.httpService.get<Blob>(`/v1/external/pod/${this.id}`, {
      params,
      headers: this.defaultRequestHeaders,
      responseType: 'blob',
    });
  }
}
