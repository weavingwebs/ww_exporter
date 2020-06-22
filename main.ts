import { serve } from 'https://deno.land/std@v0.58.0/http/server.ts';
import { QueryParams, RequestPayload } from './public/request_payload.ts';

const filename = 'test.csv';

const server = serve({port: 80});
console.log('Starting exporter http listener');
for await (const request of server) {
  try {
    console.log(request.method, request.url);

    // Parse query string into variables.
    const url = new URL(request.url, 'http://urlneedsadomaintowork');
    const queryParams: QueryParams = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // We spawn a sub-process so that:
    // a) compile errors in the handler scripts are not fatal.
    // b) compiled handler scripts get re-compiled when changed.
    const requestPayload: RequestPayload = {
      scriptPath: '/app/examples/paged.ts',
      jwt: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE1OTI4NDE4MTEsImV4cCI6MTU5Mjg0NTQxMSwiZHJ1cGFsIjp7InVpZCI6IjExOSJ9fQ.j7xrJjxzwk-kjOM1j9u7V4Ed5ZgZmEPvUyFJcIfELNYZen0f7fDz_eDc9EAsywWxWXAlWUoORjnImYWrI750xcrnKG7nQx7gRovOD-SRWd2IGPR4ESyc2thDryRf-nmbhJtxKQ35-YeXh38Vw1s2VbjT2JQ9i9G-j4nIP2FnIn3Cq4f0e8dtZE4TlwCBICKHNoPuTWzL5z2z0u0ddD9IGesCez6RgfWhhw29ZckMmqDUYGzr6OGXQQlRae09vugBMJ4UFe_FKn3PFcfSJ59mFpQOvk5G64a9_4-JrbYXvqdi-MIVqouSx3Hd1NPLh4IfH7bDZfb_Nc8YPh_86EkTbA',
      site: 'engines',
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

    await request.respond({
      headers: new Headers({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"${filename}.csv\"`,
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
  }
}
