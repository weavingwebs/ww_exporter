export interface RequestPayload {
  scriptPath: string
  jwt: string;
  site: string;
  queryParams: QueryParams;
}

export interface QueryParams {[key: string]: string|null}
