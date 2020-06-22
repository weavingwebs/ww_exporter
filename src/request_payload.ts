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

export interface QueryParams {[key: string]: string|null}

export const getScriptPath = (site: Site, exportId: string) =>
  path.join(site.path, path.basename(exportId) + '.ts')
;
