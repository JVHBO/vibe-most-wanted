import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Proxy Myinstants API — Vercel IPs are blocked by Myinstants, Convex IPs are not
http.route({
  path: "/myinstants",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const BASE = "https://www.myinstants.com";
    const apiUrl = search
      ? `${BASE}/api/v1/instants/?name=${encodeURIComponent(search)}&format=json`
      : `${BASE}/api/v1/instants/featured/?format=json`;

    try {
      const res = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.myinstants.com/",
        },
      });

      const data = res.ok ? await res.json() : { results: [] };
      const results = (data.results ?? []).slice(0, 24).map((item: any) => ({
        name: item.name as string,
        url: item.sound?.startsWith("http") ? item.sound : `${BASE}${item.sound}`,
      }));

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }),
});

// CORS preflight for /myinstants
http.route({
  path: "/myinstants",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// Proxy Myinstants audio files — has CORS issue when called directly from browser
http.route({
  path: "/audio-proxy",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const audioUrl = url.searchParams.get("url") || "";

    if (!audioUrl.includes("myinstants.com")) {
      return new Response("Domain not allowed", { status: 403 });
    }

    try {
      const res = await fetch(audioUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.myinstants.com/",
        },
      });

      if (!res.ok) return new Response("Fetch failed", { status: res.status });

      const buffer = await res.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("Content-Type") || "audio/mpeg",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      return new Response("Proxy error", { status: 500 });
    }
  }),
});

http.route({
  path: "/audio-proxy",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }),
});

export default http;
