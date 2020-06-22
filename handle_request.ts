import { ExportHandler, GraphQlFunction } from './public/handler.ts';
import { graphql } from './src/graphql.ts';
import { makeCsvRow } from './src/csv.ts';
import { getScriptPath, RequestPayload } from './src/request_payload.ts';

// Parse the payload.
const {authHeader, site, exportId, queryParams}: RequestPayload = JSON.parse(Deno.args[0]);
const scriptPath = getScriptPath(site, exportId);

// Import the export handler.
const {header, handler}: ExportHandler = await import(scriptPath);
if (typeof header === 'undefined') {
  throw new Error(`Export script ${scriptPath} must export 'header' (i.e. export const header: CsvRow)`);
}
if (typeof handler === 'undefined') {
  throw new Error(`Export script ${scriptPath} must export 'handler' (i.e. export const handler: ExportHandlerFunction)`);
}

const baseUri = site.baseUri[site.baseUri.length - 1] === '/' ? site.baseUri.substring(0, site.baseUri.length - 1) : site.baseUri;
const handlerGql: GraphQlFunction = (uri, query, variables) => graphql(
  `${baseUri}/${uri}`,
  authHeader,
  query,
  variables,
);
const generator = await handler(handlerGql, queryParams);

const writer = Deno.stdout;
const encoder = new TextEncoder();

// Write BOM.
writer.writeSync(new Uint8Array([0xEF, 0xBB, 0xBF]));

// Write header.
const row = Object.keys(header)
  .map(key => makeCsvRow(header[key]))
  .join(',')
;
writer.writeSync(encoder.encode(row + "\r\n"));

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
      writer.writeSync(encoder.encode(csv + "\r\n"));
    }
  );
}
