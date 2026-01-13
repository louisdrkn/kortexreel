import { corsHeaders } from "./cors.ts";

export type Handler = (req: Request) => Promise<Response>;

export const serveFunction = (handler: Handler) => {
  Deno.serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 2. Run Handler
      const response = await handler(req);

      // 3. Inject CORS headers if missing (and safe to do so)
      // Note: We can't modify an existing Response object's headers easily if it's immutable,
      // so we create a new one if needed, or rely on the handler to use the helper.
      // Ideally, the handler returns a Response. We will wrap it to ensure headers.

      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (!newHeaders.has(key)) {
          newHeaders.set(key, value);
        }
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error("Function Error:", error);

      // 4. Standardized Error Response
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "Unknown Internal Error",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  });
};
