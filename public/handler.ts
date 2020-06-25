export type GraphQlFunction = <TQueryResponse, TQueryVariables = undefined>(
  uri: string,
  query: string,
  variables?: TQueryVariables,
) => Promise<TQueryResponse>;

export interface Price {
  number: string;
  currency_code: string;
}

export type CsvValue = string|number|Price|null|undefined;

export interface CsvRow {[key: string]: CsvValue}

export interface Site {
  path: string
  baseUri: string
}

export interface QueryParams {
  [key: string]: string[] | string | null
}

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

export interface ExportHandlerParams<
  V extends object = {},
  Q extends QueryParams = {},
> {
  graphql: GraphQlFunction
  queryParams: Q
  variables: V|null
}

export type ExportHandlerFunction<
  V extends object = {},
  Q extends QueryParams = {},
> = (
  params: ExportHandlerParams<V, Q>,
) => AsyncGenerator<CsvRow[]>;

export interface ExportHandler {
  header: CsvRow
  handler: ExportHandlerFunction
}

export type PagedHandlerGeneratorGraphql<T> = (offset: number) => Promise<T>

export const pagedHandlerGenerator = async function*<
  T extends {total: number, items: I[]},
  I extends object = {},
>(
  graphql: PagedHandlerGeneratorGraphql<T>,
) {
  let offset = 0;
  let total: number|null = null;

  while (total === null || offset < total) {
    const page = await graphql(offset);
    total = page.total;
    offset += page.items.length;
    yield page.items;
  }
}
