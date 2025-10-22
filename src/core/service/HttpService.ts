export interface HttpHeaders {
  [key: string]: string;
}

export interface HttpParams {
  [key: string]: string | number | boolean;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: HttpHeaders;
  success: boolean;
}

export interface HttpRequestConfig {
  headers?: HttpHeaders;
  params?: HttpParams;
  timeout?: number;
  contentType?: 'json' | 'form-data' | 'form-urlencoded';
}

export interface FormDataField {
  value: string | number | boolean | Blob;
  filename?: string;
}

export function httpGetFileMimeType(extension: string): string {
  const normalizedExt = extension.toLowerCase().replace(/^\./, '');
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',

    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',

    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',

    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
    mkv: 'video/x-matroska',

    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    rtf: 'application/rtf',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',

    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    bz2: 'application/x-bzip2',

    ts: 'text/typescript',
    tsx: 'text/tsx',
    jsx: 'text/jsx',
    py: 'text/x-python',
    java: 'text/x-java-source',
    c: 'text/x-c',
    cpp: 'text/x-c++src',
    h: 'text/x-c',
    hpp: 'text/x-c++hdr',
    php: 'text/x-php',
    rb: 'text/x-ruby',
    go: 'text/x-go',
    rs: 'text/x-rustsrc',
    swift: 'text/x-swift',
    kt: 'text/x-kotlin',
    scala: 'text/x-scala',

    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
    eot: 'application/vnd.ms-fontobject',

    bin: 'application/octet-stream',
    exe: 'application/x-msdownload',
    dmg: 'application/x-apple-diskimage',
    iso: 'application/x-iso9660-image',
  };
  return mimeTypes[normalizedExt] || 'application/octet-stream';
}

export class HttpService {
  private baseURL: string;
  private defaultHeaders: HttpHeaders;

  constructor(baseURL: string = '', defaultHeaders: HttpHeaders = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  private buildURL(endpoint: string, params?: HttpParams): string {
    const url = new URL(endpoint, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private combineHeaders(
    customHeaders?: HttpHeaders,
    contentHeaders?: HttpHeaders
  ): HttpHeaders {
    const combined = { ...this.defaultHeaders };
    if (contentHeaders && !contentHeaders['Content-Type']) {
      delete combined['Content-Type'];
    }
    return {
      ...combined,
      ...contentHeaders,
      ...customHeaders,
    };
  }

  private prepareRequestBody(
    body: any,
    contentType: string = 'json'
  ): { body: any; headers: HttpHeaders } {
    const headers: HttpHeaders = {};
    switch (contentType) {
      case 'form-data':
        const formData = new FormData();
        if (body && typeof body === 'object') {
          Object.entries(body).forEach(([key, value]) => {
            if (value instanceof Blob) {
              formData.append(key, value);
            } else if (
              typeof value === 'object' &&
              'value' in (value as Object)
            ) {
              const field = value as FormDataField;
              if (field.value instanceof Blob) {
                formData.append(key, field.value, field.filename);
              } else {
                formData.append(key, String(field.value));
              }
            } else if (Array.isArray(value)) {
              value.forEach(item => {
                if (item instanceof Blob) {
                  formData.append(key, item);
                } else {
                  formData.append(key, String(item));
                }
              });
            } else {
              formData.append(key, String(value));
            }
          });
        }
        return { body: formData, headers };
      case 'form-urlencoded':
        const urlParams = new URLSearchParams();
        if (body && typeof body === 'object') {
          Object.entries(body).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(item => urlParams.append(key, String(item)));
            } else {
              urlParams.append(key, String(value));
            }
          });
        }
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        return { body: urlParams.toString(), headers };
      case 'json':
      default:
        headers['Content-Type'] = 'application/json';
        return { body: body ? JSON.stringify(body) : undefined, headers };
    }
  }

  private async processResponse<T>(
    response: Response
  ): Promise<HttpResponse<T>> {
    const headers: HttpHeaders = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    let data: T;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = (await response.json()) as unknown as T;
    } else {
      data = (await response.text()) as unknown as T;
    }
    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      success: response.ok,
    };
  }

  async get<T = any>(
    endpoint: string,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.combineHeaders(config?.headers);
    try {
      const controller = new AbortController();
      const timeoutId = config?.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null;
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return await this.processResponse<T>(response);
    } catch (error) {
      throw new Error(`GET Request failed: ${error}`);
    }
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const contentType = config?.contentType || 'json';
    const { body: requestBody, headers: contentHeaders } =
      this.prepareRequestBody(body, contentType);
    const headers = this.combineHeaders(config?.headers, contentHeaders);
    try {
      const controller = new AbortController();
      const timeoutId = config?.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: controller.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return await this.processResponse<T>(response);
    } catch (error) {
      throw new Error(`POST Request failed: ${error}`);
    }
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const contentType = config?.contentType || 'json';
    const { body: requestBody, headers: contentHeaders } =
      this.prepareRequestBody(body, contentType);
    const headers = this.combineHeaders(config?.headers, contentHeaders);
    try {
      const controller = new AbortController();
      const timeoutId = config?.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null;
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: requestBody,
        signal: controller.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return await this.processResponse<T>(response);
    } catch (error) {
      throw new Error(`PUT Request failed: ${error}`);
    }
  }

  async patch<T = any>(
    endpoint: string,
    body?: any,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const contentType = config?.contentType || 'json';
    const { body: requestBody, headers: contentHeaders } =
      this.prepareRequestBody(body, contentType);
    const headers = this.combineHeaders(config?.headers, contentHeaders);
    try {
      const controller = new AbortController();
      const timeoutId = config?.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null;
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: requestBody,
        signal: controller.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return await this.processResponse<T>(response);
    } catch (error) {
      throw new Error(`PATCH Request failed: ${error}`);
    }
  }

  async delete<T = any>(
    endpoint: string,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.combineHeaders(config?.headers);
    try {
      const controller = new AbortController();
      const timeoutId = config?.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null;
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return await this.processResponse<T>(response);
    } catch (error) {
      throw new Error(`DELETE Request failed: ${error}`);
    }
  }

  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  async uploadFile<T = any>(
    endpoint: string,
    file: Blob,
    fieldName: string = 'file',
    additionalFields?: Record<string, string | number | boolean>,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const formData: Record<string, any> = {
      [fieldName]: file,
    };
    if (additionalFields) {
      Object.assign(formData, additionalFields);
    }
    return this.post<T>(endpoint, formData, {
      ...config,
      contentType: 'form-data',
    });
  }

  async uploadFiles<T = any>(
    endpoint: string,
    files: Blob[],
    fieldName: string = 'files',
    additionalFields?: Record<string, string | number | boolean>,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const formData: Record<string, any> = {
      [fieldName]: files,
    };
    if (additionalFields) {
      Object.assign(formData, additionalFields);
    }
    return this.post<T>(endpoint, formData, {
      ...config,
      contentType: 'form-data',
    });
  }
}
