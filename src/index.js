import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(
  new URL("../public/", import.meta.url)
);

logging.set_level(logging.NONE);

Object.assign(wisp.options, {
  allow_udp_streams: false,
  hostname_blacklist: [],
  dns_servers: ["1.1.1.3", "1.0.0.3"]
});

const fastify = Fastify({
  logger: true,

  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader(
          "Cross-Origin-Opener-Policy",
          "same-origin"
        );

        res.setHeader(
          "Cross-Origin-Embedder-Policy",
          "require-corp"
        );

        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url?.endsWith("/wisp/")) {
          wisp.routeRequest(req, socket, head);
        } else {
          socket.end();
        }
      });
  }
});

fastify.register(fastifyStatic, {
  root: publicPath,
  decorateReply: true
});

fastify.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scram/",
  decorateReply: false
});

fastify.register(fastifyStatic, {
  root: libcurlPath,
  prefix: "/libcurl/",
  decorateReply: false
});

fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false
});

fastify.get("/api/search", async (request, reply) => {
  const q = String(request.query?.q || "").trim();

  if (!q) {
    return reply.code(400).send({
      error: "Missing search query."
    });
  }

  if (q.length > 600) {
    return reply.code(400).send({
      error: "Search query is too long."
    });
  }

  try {
    const url = new URL(
      "https://en.wikipedia.org/w/api.php"
    );

    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", q);
    url.searchParams.set("srlimit", "10");
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "DinoLinks/1.0"
      }
    });

    if (!response.ok) {
      return reply.code(502).send({
        error: `Search provider returned HTTP ${response.status}.`
      });
    }

    const data = await response.json();

    const results = (data?.query?.search || []).map((item) => ({
      title: item.title,
      url:
        "https://en.wikipedia.org/wiki/" +
        encodeURIComponent(
          item.title.replace(/ /g, "_")
        ),
      description: String(item.snippet || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
    }));

    return reply.send({
      type: "web",
      query: q,
      results
    });

  } catch (error) {
    request.log.error(error);

    return reply.code(502).send({
      error: "Could not reach the search provider."
    });
  }
});

fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith("/api/")) {
    return reply.code(404).send({
      error: "API route not found."
    });
  }

  return reply
    .code(404)
    .type("text/html")
    .sendFile("404.html");
});

fastify.server.on("listening", () => {
  const address = fastify.server.address();

  console.log(
    `Dino Links running at http://localhost:${address.port}`
  );

  console.log(
    `http://${hostname()}:${address.port}`
  );
});

function shutdown() {
  fastify.close().finally(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const port = Number(process.env.PORT) || 8080;

fastify.listen({
  port,
  host: "0.0.0.0"
}).catch((error) => {
  fastify.log.error(error);
  process.exit(1);
});