import { QueryParams } from '../src/request_payload.ts';

export type GraphQlFunction = <TQueryResponse, TQueryVariables = undefined>(
  uri: string,
  query: string,
  variables?: TQueryVariables,
) => Promise<TQueryResponse>;

export type CsvValue = string|number|null|undefined;

export interface CsvRow {[key: string]: CsvValue}

export type ExportHandlerFunction = <T extends QueryParams = {}>(
  graphql: GraphQlFunction,
  queryParams: T,
) => AsyncGenerator<CsvRow[]>;

export interface ExportHandler {
  header: CsvRow
  handler: ExportHandlerFunction
}

export type PagedHandlerGeneratorGraphql<T> = (offset: number) => Promise<T>

export const pagedHandlerGenerator = async function*<T extends {total: number, items: any[]}>(
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
