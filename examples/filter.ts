import { CsvRow, ExportHandlerFunction } from '../public/handler.ts';

const query = `
query {
  engineCodes(limit:100) {
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
  engineCode: string|null;
}

export const header: CsvRow = {
  'id': 'Id',
  'engineCode': 'Engine Code',
  'make': 'Make',
}

export const handler: ExportHandlerFunction<QueryVariables> = async function*({graphql, variables})  {
  if (!variables) {
    throw new Error('Missing variables');
  }
  const data = await graphql<QueryResult, QueryVariables>(
    'graphql/office',
    query,
    variables
  );
  yield data.engineCodes.items;
}
