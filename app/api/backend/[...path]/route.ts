type BackendRouteContext = { params: Promise<{ path: string[] }> };

const backendApiBase = (process.env.BACKEND_API_URL ?? "http://127.0.0.1:4100/api/v1").replace(/\/+$/, "");
const forwardedRequestHeaders = ["accept", "content-type", "cookie", "origin", "user-agent", "x-csrf-token"];
const forwardedResponseHeaders = ["cache-control", "content-type", "retry-after", "x-request-id"];

async function proxy(request: Request, context: BackendRouteContext): Promise<Response> {
  const { path } = await context.params;
  const url = new URL(`${backendApiBase}/${path.map(encodeURIComponent).join("/")}`);
  url.search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "The API service is temporarily unavailable",
          details: [],
        },
        meta: {},
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const responseHeaders = new Headers();
  for (const name of forwardedResponseHeaders) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
