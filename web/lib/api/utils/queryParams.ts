import { getUserCountryCode } from "@/lib/utils/countryUtils";

export interface QueryParamsConfig<T = object> {
  params?: T;
  addCountry?: boolean;
  country?: string;
}

export function buildQueryParams<T extends object>(
  config: QueryParamsConfig<T> = {}
): URLSearchParams {
  const queryParams = new URLSearchParams();

  if (config.params) {
    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  if (config.addCountry && !("country" in (config.params || {}))) {
    const countryCode = config.country || getUserCountryCode();
    queryParams.append("country", countryCode);
  }

  return queryParams;
}

export function buildQueryString<T extends object>(
  config: QueryParamsConfig<T> = {}
): string {
  const queryParams = buildQueryParams(config);
  const query = queryParams.toString();
  return query ? `?${query}` : "";
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function addPaginationParams(
  params: URLSearchParams,
  pagination: PaginationParams
): void {
  if (pagination.page !== undefined) {
    params.append("page", String(pagination.page));
  }
  if (pagination.pageSize !== undefined) {
    params.append("page_size", String(pagination.pageSize));
  }
}

/**
 * @deprecated Country is now sent via X-User-Country header in proxy requests.
 * This function is kept for Django API endpoints that still use country as a query param.
 */
export function addCountryParam(
  params: URLSearchParams,
  country?: string
): void {
  const countryCode = country || getUserCountryCode();
  params.append("country", countryCode);
}

export interface FlexFieldOptions {
  fields?: string[];
  expand?: string[];
  omit?: string[];
  sourceFields?: string[];
  [key: string]: unknown;
}

export function buildFlexFieldsQuery(options: FlexFieldOptions): string {
  const params = new URLSearchParams();

  if (options.fields && options.fields.length > 0) {
    params.append("fields", options.fields.join(","));
  }

  if (options.expand && options.expand.length > 0) {
    params.append("expand", options.expand.join(","));
  }

  if (options.omit && options.omit.length > 0) {
    params.append("omit", options.omit.join(","));
  }

  if (options.sourceFields && options.sourceFields.length > 0) {
    params.append("source_fields", options.sourceFields.join(","));
  }

  // Handle any additional query parameters
  Object.entries(options).forEach(([key, value]) => {
    if (
      key !== "fields" &&
      key !== "expand" &&
      key !== "omit" &&
      key !== "sourceFields" &&
      value !== undefined &&
      value !== null
    ) {
      if (Array.isArray(value)) {
        params.append(key, value.join(","));
      } else {
        params.append(key, String(value));
      }
    }
  });

  return params.toString();
}
