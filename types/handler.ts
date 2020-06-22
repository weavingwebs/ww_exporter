export type GraphQlFunction = <TQueryResponse, TQueryVariables = undefined>(
  uri: string,
  query: string,
  variables?: TQueryVariables,
) => Promise<TQueryResponse>;

export type CsvValue = string|number|null|undefined;

export interface CsvRow {[key: string]: CsvValue}

export type ExportHandlerFunction = (
  graphql: GraphQlFunction
) => Promise<CsvRow[]>;

export interface ExportHandler {
  header: CsvRow
  handler: ExportHandlerFunction
}
