import { CsvRow, ExportHandlerFunction } from '../types/handler.ts';

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

export const header: CsvRow = {
  'id': 'Id',
  'engineCode': 'Engine Code',
  'make': 'Make',
}

export const handler: ExportHandlerFunction = async (graphql) => {
  const data = await graphql<QueryResult>('graphql/office', query);
  return data.engineCodes.items;
}
