import { CsvRow, ExportHandlerFunction, pagedHandlerGenerator } from '../public/handler.ts';

const query = `
query ExampleQuery($limit: Int!, $offset: Int!, $engineCode: String) {
  engineCodes(limit: $limit, offset: $offset, filters: {engineCode: $engineCode}) {
    total
    items {
      id
      engineCode
      make
    }
  }
}
`;

interface EngineCode extends CsvRow {
  id: string
  engineCode: string
  make: string|null
}

interface QueryResult {
  engineCodes: {
    total: number
    items: EngineCode[];
  }
}

interface QueryVariables {
  limit: number;
  offset: number;
  engineCode: string|null;
}

export const header: CsvRow = {
  'id': 'Id',
  'engineCode': 'Engine Code',
  'make': 'Make',
}

export const handler: ExportHandlerFunction = async function*(graphql, queryParams) {
  yield* pagedHandlerGenerator(async offset => {
    const page = await graphql<QueryResult, QueryVariables>(
      'graphql/office',
      query,
      {
        limit: 200,
        offset,
        engineCode: queryParams.engineCode,
      },
    );
    return page.engineCodes;
  });
}
