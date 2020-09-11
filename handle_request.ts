import * as path from 'https://deno.land/std@v0.64.0/path/mod.ts';
import { ExportHandler, GraphQlFunction, QueryParams, Site } from './public/handler.ts';
import { graphql } from './src/graphql.ts';
import { makeCsvRow } from './src/csv.ts';

interface ExportPayload<V extends object = {}> {
  authHeader: string|null;
  site: Site;
  exportId: string;
  queryParams: QueryParams;
  variables: V|null;
}

// Parse the payload.
const {authHeader, site, exportId, queryParams, variables}: ExportPayload = JSON.parse(Deno.args[0]);
const scriptPath = path.join(site.path, path.basename(exportId) + '.ts');

// Import the export handler.
const {header, handler}: ExportHandler = await import(scriptPath);
if (typeof header === 'undefined') {
  throw new Error(`Export script ${scriptPath} must export 'header' (i.e. export const header: CsvRow)`);
}
if (typeof handler === 'undefined') {
  throw new Error(`Export script ${scriptPath} must export 'handler' (i.e. export const handler: ExportHandlerFunction)`);
}

// Check the first header item is not 'ID'.
const headerLabels = Object.values(header);
if (headerLabels && headerLabels[0] === 'ID') {
  throw new Error(`You cannot use 'ID' as the first header label because Excel is stupid and will not open it. Try 'Id' instead.`)
}

// Get the generator for the requested export.
const baseUri = site.baseUri[site.baseUri.length - 1] === '/' ? site.baseUri.substring(0, site.baseUri.length - 1) : site.baseUri;
const handlerGql: GraphQlFunction = (uri, query, vars) => graphql(
  `${baseUri}/${uri}`,
  authHeader,
  query,
  vars,
);
const generator = await handler({graphql: handlerGql, queryParams, variables});

// Write to stdout.
const writer = Deno.stdout;
const encoder = new TextEncoder();

// Write BOM.
writer.writeSync(new Uint8Array([0xEF, 0xBB, 0xBF]));

// Write header.
const row = Object.keys(header)
  .map(key => makeCsvRow(header[key]))
  .join(',')
;
writer.writeSync(encoder.encode(row + "\n"));

// Write values.
for await (const data of generator) {
  data.forEach(
    row => {
      // Loop through the header instead of the row to ensure consistent order
      // of columns & correct handling of undefined values.
      const csv = Object.keys(header)
        .map(key => makeCsvRow(row[key]))
        .join(',')
      ;

      // NOTE: Technically CSVs should use CRLF but macOS mail mangles
      // attachments to add a duplicate CR at the end of every line, resulting
      // in most csv parses getting empty lines between each row. Luckily MS are
      // not nearly as moronic as apple these days and will happily interpret
      // CSVs with LF endings.
      writer.writeSync(encoder.encode(csv + "\n"));
    }
  );
}
