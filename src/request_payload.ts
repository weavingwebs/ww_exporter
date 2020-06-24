import * as path from 'https://deno.land/std@v0.58.0/path/mod.ts';

export interface RequestPayload {
  authHeader: string|null;
  site: Site;
  exportId: string;
  queryParams: QueryParams;
}

export interface Site {
  path: string
  baseUri: string
}

export interface QueryParams {[key: string]: string[]|string|null}

export const getScriptPath = (site: Site, exportId: string) =>
  path.join(site.path, path.basename(exportId) + '.ts')
;

export const getStringFromQuery = (query: QueryParams, key: string) => {
  const val = query[key];
  if (typeof val === 'undefined') {
    return undefined;
  }
  if (val && Array.isArray(val)) {
    return val[0];
  }
  return val;
}
