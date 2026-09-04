import { Hono } from "hono";

const app = new Hono();

// ---------------------------------------------------------------------------
// GET /.well-known/opencode
// Public discovery endpoint — OpenCode reads this on `opencode auth login <url>`.
// Returns everything that would otherwise have to be copy-pasted by hand into
// ~/.config/opencode/opencode.jsonc: the auth command used to mint the token,
// and the remote config (provider + models + mcp) merged as the base layer.
// Reference: https://opencode.ai/docs/config/#remote
// ---------------------------------------------------------------------------

app.get("/.well-known/opencode", (c) => {
  const base = new URL(c.req.url).origin; // e.g. https://aig.antoinebrossault.com

  return c.json(
    {
      auth: {
        // `cloudflared access login` opens the browser, authenticates against
        // the Access application protecting this domain, and prints the JWT.
        // OpenCode captures stdout and stores it as the MY_GATEWAY_TOKEN env
        // referenced below via `{env:MY_GATEWAY_TOKEN}`.
        command: [
          "cloudflared",
          "access",
          "login",
          "--no-verbose",
          "-app=https://aig.antoinebrossault.com",
        ],
        env: "MY_GATEWAY_TOKEN",
      },
      config: {
        provider: {
          // Native providers — recognized IDs in opencode/models.dev, so the
          // full upstream model catalog is discovered automatically. Only
          // baseURL/apiKey are overridden to route through the AI Gateway
          // custom domain (Access-protected). BYOK is configured on the
          // "playground" gateway for these three providers.
          openai: {
            options: {
              baseURL: `${base}/openai/v1`,
              apiKey: "{env:MY_GATEWAY_TOKEN}",
            },
          },
          anthropic: {
            options: {
              baseURL: `${base}/anthropic/v1`,
              apiKey: "{env:MY_GATEWAY_TOKEN}",
            },
          },
          deepseek: {
            options: {
              baseURL: `${base}/deepseek/v1`,
              apiKey: "{env:MY_GATEWAY_TOKEN}",
            },
          },
          // Hetzner Experiments Platform — Inference API, registered as a
          // Custom Provider on AI Gateway (slug "hetzner"). Not a recognized
          // opencode provider id, so npm + explicit models are required.
          // Reference: https://developers.cloudflare.com/ai-gateway/configuration/custom-providers/
          hetzner: {
            npm: "@ai-sdk/openai-compatible",
            name: "Hetzner AI (Cloudflare AI Gateway)",
            options: {
              // Custom providers require the "custom-" prefix in the AI
              // Gateway URL — the OpenAI SDK appends /chat/completions.
              baseURL: `${base}/custom-hetzner`,
              apiKey: "{env:MY_GATEWAY_TOKEN}",
            },
            // Live catalog verified via GET /custom-hetzner/models — the
            // original DeepSeek-V4-Flash-0731 / GLM-5.2-NVFP4 / Kimi-K2.7-Code
            // models are no longer served; Qwen3.8-27B is new.
            models: {
              "Qwen/Qwen3.6-35B-A3B-FP8": {
                name: "Qwen3.6 35B A3B FP8",
                canReason: false,
                modalities: { input: ["text", "image"], output: ["text"] },
                costPer1mIn: 0,
                costPer1mOut: 0,
                contextWindow: 262144,
                defaultMaxTokens: 32000,
              },
              "Qwen3.8-27B": {
                name: "Qwen3.8 27B",
                canReason: false,
                modalities: { input: ["text", "image"], output: ["text"] },
                costPer1mIn: 0,
                costPer1mOut: 0,
                contextWindow: 262144,
                defaultMaxTokens: 32000,
              },
            },
          },
          "my-gateway": {
            npm: "@ai-sdk/openai-compatible",
            name: "My AI Gateway",
            options: {
              baseURL: `${base}/compat`,
              apiKey: "{env:MY_GATEWAY_TOKEN}",
              headers: {
                "cf-aig-gateway-id": "playground",
                "cf-aig-metadata": JSON.stringify({ team: "platform" }),
              },
            },
            models: {
              "workers-ai/@cf/moonshotai/kimi-k2.6": {
                name: "Kimi K2.6",
                canReason: true,
                modalities: { input: ["text", "image"], output: ["text"] },
                costPer1mIn: 0.95,
                costPer1mOut: 4.0,
                contextWindow: 262144,
                defaultMaxTokens: 32000,
              },
              "@cf/zai-org/glm-4.7-flash": {
                name: "GLM 4.7 Flash",
                canReason: true,
                modalities: { input: ["text", "image"], output: ["text"] },
                costPer1mIn: 0.06,
                costPer1mOut: 0.4,
                contextWindow: 131072,
                defaultMaxTokens: 32000,
              },
              "@cf/openai/gpt-oss-120b": {
                name: "GPT-OSS 120B",
                canReason: true,
                modalities: { input: ["text", "image"], output: ["text"] },
                costPer1mIn: 0.35,
                costPer1mOut: 0.75,
                contextWindow: 128000,
                defaultMaxTokens: 32000,
              },
              "@cf/google/gemma-4-26b-a4b-it": {
                name: "Gemma 4 26B",
                canReason: true,
                modalities: { input: ["text", "image"], output: ["text"] },
                costPer1mIn: 0.1,
                costPer1mOut: 0.3,
                contextWindow: 256000,
                defaultMaxTokens: 32000,
              },
            },
          },
        },
        mcp: {
          "mcp-portal-antoinee": {
            type: "remote",
            enabled: true,
            url: "https://mcp-portal.antoinee.xyz/mcp",
          },
        },
      },
    },
    200,
    { "cache-control": "no-store" }
  );
});

export default app;
