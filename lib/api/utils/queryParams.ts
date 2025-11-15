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

export function addCountryParam(
  params: URLSearchParams,
  country?: string
): void {
  const countryCode = country || getUserCountryCode();
  params.append("country", countryCode);
}
