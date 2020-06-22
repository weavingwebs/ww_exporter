import { serve } from 'https://deno.land/std@v0.58.0/http/server.ts';
import * as yaml from 'https://deno.land/std@v0.58.0/encoding/yaml.ts';
import { getScriptPath, QueryParams, RequestPayload, Site } from './src/request_payload.ts';

const csvFilename = 'test.csv';

const server = serve({port: 80});
console.log('Starting exporter http listener');
for await (const request of server) {
  let responseStarted = false;
  try {
    console.log(request.conn.remoteAddr, request.method, request.url);

    // Parse url.
    const url = new URL(request.url, 'http://urlneedsadomaintowork');
    const [,siteId, exportId] = url.pathname.split('/');
    if (!siteId) {
      const error = 'missing site id from url';
      console.error(error);
      await request.respond({
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        status: 400,
        body: JSON.stringify({error}),
      });
      continue;
    }
    if (!exportId) {
      const error = 'missing export id from url';
      console.error(error);
      await request.respond({
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        status: 400,
        body: JSON.stringify({error}),
      });
      continue;
    }

    // Read config.
    const configYaml = await Deno.readTextFile('/app/config.yml');
    const config = yaml.parse(configYaml) as {[site: string]: Site};

    // Check the export exists.
    const site = config[siteId];
    if (!site) {
      const error = 'unknown site';
      console.error(error);
      await request.respond({
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        status: 404,
        body: JSON.stringify({error}),
      });
      continue;
    }
    const filePath = getScriptPath(site, exportId);
    try {
      await Deno.lstat(filePath);
    }
    catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        const error = 'unknown export id';
        console.error(`${error}: ${filePath}`);
        await request.respond({
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
          status: 404,
          body: JSON.stringify({error}),
        });
        continue;
      }
      throw error;
    }

    // Parse query string into variables.
    const queryParams: QueryParams = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // We spawn a sub-process so that:
    // a) compile errors in the handler scripts are not fatal.
    // b) compiled handler scripts get re-compiled when changed.
    const requestPayload: RequestPayload = {
      authHeader: request.headers.get('Authorization'),
      site,
      exportId,
      queryParams,
    }
    const p = Deno.run({
      cmd: [
        "deno",
        "run",
        "--allow-read",
        "--allow-net",
        "/app/handle_request.ts",
        JSON.stringify(requestPayload)
      ],
      stdout: "piped",
    });

    responseStarted = true;
    await request.respond({
      headers: new Headers({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"${csvFilename}.csv\"`,
      }),
      body: p.stdout,
    });

    if ((await p.status()).code !== 0) {
      console.error('Handler script failed');
    }

    p.close();
  }
  catch (error) {
    console.error(`Error from ${request.url}`, error);
    if (!responseStarted) {
      await request.respond({
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        status: 500,
        body: JSON.stringify({error: 'An unexpected error occurred'}),
      });
    }
  }
}
