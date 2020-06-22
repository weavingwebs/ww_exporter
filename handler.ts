export type GraphQlFunction = <TQueryResponse, TQueryVariables = undefined>(
  uri: string,
  query: string,
  variables?: TQueryVariables,
) => Promise<TQueryResponse>;

export interface CsvRow {[key: string]: string}

export type ExportHandlerFunction = (
  graphql: GraphQlFunction
) => Promise<CsvRow[]>;

export interface ExportHandler {
  header: CsvRow
  handler: ExportHandlerFunction
}
