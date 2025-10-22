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

export class PodService {
  private id: string;
  private httpService: HttpService;
  private defaultRequestParams: HttpParams = {};
  private defaultRequestHeaders: HttpHeaders = {};

  constructor(podId: string, url: PodUrlData, auth: PodAuth) {
    this.id = podId;
    const domain = url.domain ?? DEFAULT_DOMAIN;
    let baseUrl: string = `https://service.${url.namespace}.${domain}`;
    switch (auth.type) {
      case 'queryKey':
        this.defaultRequestParams['key'] = auth.value;
        break;
      case 'bearerToken':
        this.defaultRequestHeaders['Authorization'] = `Bearer ${auth.value}`;
        break;
    }
    this.httpService = new HttpService(baseUrl);
  }

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

  push(affectedRecord: string, data: PodPushData): Promise<HttpResponse<any>> {
    return this.httpService.post(`/v1/external/pod/${this.id}`, data, {
      params: {
        ...this.defaultRequestParams,
        ...{ $record_id: affectedRecord },
      },
      headers: this.defaultRequestHeaders,
      contentType: 'form-data',
    });
  }
}
