import { ExportHandler, GraphQlFunction } from './handler.ts';
import { graphql } from './src/graphql.ts';
import { serve } from 'https://deno.land/std@v0.58.0/http/server.ts';
import { makeCsvRow } from './src/csv.ts';

const jwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE1OTI4MzA4NDIsImV4cCI6MTU5MjgzNDQ0MiwiZHJ1cGFsIjp7InVpZCI6IjExOSJ9fQ.qxWKPXaRd2Z47R7psMVIHoJCpnEnImacCrMS_v2vF4gGHPZPC_AkW6t5ahpSSAGWlqpLiYX2ZkvGVRzSehN-r-dXS2B41_VoR4Wgbmlsw4ScJ56pw_RVwlhOlZs_5Z4W0Pwumsxtm3k4wBPkhlLS3GsRPO0M-NvEsBp-Nw7gUZ6Sa1ZO-GNzfGhC4S4oWuGfEGF4M9toYsian8S387UrPFlPP37j-k1MK3UpmF0T3cSsd8AVDpjhtp0ylyr6NRV2GqffA1WLTrWDYe0Z9U-c_utjP1gkzMyIv3b7QwN03w78l4C4JECe7Xz13ztlGkGusZSZCiav71_XK4o7qh_82w';
const site = 'engines';
const scriptPath = './script.ts';
const filename = 'test.csv';

const server_map = {
  engines: 'http://engines/'
};

const server = serve({port: 80});
console.log('Starting exporter http listener');
for await (const request of server) {
  const {header, handler}: ExportHandler = await import(scriptPath);
  if (typeof header === 'undefined') {
    throw new Error(`Export script ${scriptPath} must export 'header' (i.e. export const header: CsvRow)`);
  }
  if (typeof handler === 'undefined') {
    throw new Error(`Export script ${scriptPath} must export 'handler' (i.e. export const handler: ExportHandlerFunction)`);
  }

  const handlerGql: GraphQlFunction = (uri, query, variables) => graphql(
    `${server_map[site]}${uri}`,
    jwt,
    query,
    variables,
  );
  const data = await handler(handlerGql);

  const body = new Deno.Buffer();
  const encoder = new TextEncoder();
  request.respond({
    headers: new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"${filename}.csv\"`,
    }),
    body,
  });

  // Write BOM.
  body.writeSync(new Uint8Array([0xEF, 0xBB, 0xBF]));

  // Write header.
  const row = Object.keys(header)
    .map(key => makeCsvRow(header[key]))
    .join(',')
  ;
  body.writeSync(encoder.encode(row + "\r\n"));

  // Write values.
  data.forEach(
    row => {
      // Loop through the header instead of the row to ensure consistent order
      // of columns & correct handling of undefined values.
      const csv = Object.keys(header)
        .map(key => makeCsvRow(row[key]))
        .join(',')
      ;
      body.writeSync(encoder.encode(csv + "\r\n"));
    }
  );

}
