import { serve } from 'https://deno.land/std@v0.58.0/http/server.ts';
import { RequestPayload } from './types/request_payload.ts';

const filename = 'test.csv';

const server = serve({port: 80});
console.log('Starting exporter http listener');
for await (const request of server) {
  try {
    console.log(request.method, request.url);

    // We spawn a sub-process so that:
    // a) compile errors in the handler scripts are not fatal.
    // b) compiled handler scripts get re-compiled when changed.
    const requestPayload: RequestPayload = {
      scriptPath: '/app/examples/simple.ts',
      jwt: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE1OTI4MzY5NDcsImV4cCI6MTU5Mjg0MDU0NywiZHJ1cGFsIjp7InVpZCI6IjExOSJ9fQ.qqu2eNuw2MKM-AmCOmtvFDLUvA8mQ9-DwnnQx1xi-_Tj0tTtRVNkOU2Kmq_xeA1FwtzxopnrWI4Y5wNzcbr2iS54TR1emFp5xQPaVPX23k5D12MFFLAB5JtI7lM96vyFo4bQwcomtSKIC2Z6rDPWa4oN31KOFPfFxzegrkvN-XfocVCveJcDJ82QZ0e_J-EuMQaQ8oRbrxPdXqXRrvliTPhCK-gGpQ3IhagC445XTumiLTI55FwhDesCjlxNvLjvPhtNz61H-m-qDgvFcZur1E04P82zqNiBngFsoNswnuVT4MHSwBxT7umf6SesmksfVK7DyYd03uSt3s1i85K9Bw',
      site: 'engines',
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

    request.respond({
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
