import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { portalRoutes } from "../routes/portalRoutes";
import { loadPortalConfig, type PortalConfig } from "../config/portalConfig";

/**
 * The foundation every Portal API endpoint stands on: token check, request ID,
 * rate limit and problem+json errors, proven through GET /v1/health.
 *
 * Mounted on a bare express app rather than app.ts, which would drag in Redis
 * and the OTel SDK.
 */

const TOKEN = "portal-test-token-0123456789abcdef";

/** A stand-in for automation-db's health check. */
function startDb(): { url: string; close: () => Promise<void> } {
	const db = express();
	db.get("/health", (_req, res) => res.json({ status: "ok" }));
	const server: Server = db.listen(0);
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : 0;
	return {
		url: `http://127.0.0.1:${port}`,
		close: () => new Promise((resolve) => server.close(() => resolve())),
	};
}

const appWith = (overrides: Partial<PortalConfig> = {}) => {
	const app = express();
	app.use(
		"/v1",
		portalRoutes({
			apiToken: TOKEN,
			rateLimitPerMinute: 100,
			dbServiceUrl: null,
			dbApiKey: null,
			...overrides,
		})
	);
	return app;
};

describe("Portal API foundation", () => {
	let db: { url: string; close: () => Promise<void> };
	beforeAll(() => {
		db = startDb();
	});
	afterAll(async () => {
		await db.close();
	});

	describe("GET /v1/health", () => {
		it("answers ok without a token when automation-db is reachable", async () => {
			const res = await request(appWith({ dbServiceUrl: db.url })).get("/v1/health");

			expect(res.status).toBe(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
		});

		it("answers degraded when automation-db cannot be reached", async () => {
			const res = await request(appWith({ dbServiceUrl: "http://127.0.0.1:1" })).get(
				"/v1/health"
			);

			expect(res.status).toBe(200);
			expect(res.body.status).toBe("degraded");
		});

		it("still answers when the token is not configured", async () => {
			const res = await request(appWith({ apiToken: null, dbServiceUrl: db.url })).get(
				"/v1/health"
			);

			expect(res.status).toBe(200);
		});
	});

	describe("X-Request-Id", () => {
		it("echoes the caller's ID", async () => {
			const res = await request(appWith()).get("/v1/health").set("X-Request-Id", "abc-123");

			expect(res.headers["x-request-id"]).toBe("abc-123");
		});

		it("makes one when none, or an unusable one, is sent", async () => {
			const none = await request(appWith()).get("/v1/health");
			const tooLong = await request(appWith())
				.get("/v1/health")
				.set("X-Request-Id", "x".repeat(129));

			expect(none.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
			expect(tooLong.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
		});
	});

	describe("token check", () => {
		it("refuses a missing token with a problem+json 401", async () => {
			const res = await request(appWith())
				.get("/v1/organizations/11899/sessions")
				.set("X-Request-Id", "req-1");

			expect(res.status).toBe(401);
			expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
			expect(res.headers["www-authenticate"]).toBe("Bearer");
			expect(res.body).toEqual({
				type: "urn:ondc:workbench:problem:unauthorized",
				title: "Unauthorized",
				status: 401,
				detail: "Missing or invalid token",
				instance: "req-1",
			});
		});

		it("refuses a wrong token", async () => {
			const res = await request(appWith())
				.get("/v1/flows")
				.set("Authorization", "Bearer not-the-token");

			expect(res.status).toBe(401);
		});

		it("lets the right token through to the next handler", async () => {
			const res = await request(appWith())
				.get("/v1/no-such-endpoint")
				.set("Authorization", `Bearer ${TOKEN}`);

			expect(res.status).toBe(404);
			expect(res.body.type).toBe("urn:ondc:workbench:problem:not-found");
			expect(res.body.detail).toBe("No such endpoint: GET /v1/no-such-endpoint");
		});

		it("answers 500, not 401, when the server has no token configured", async () => {
			const res = await request(appWith({ apiToken: null }))
				.get("/v1/flows")
				.set("Authorization", `Bearer ${TOKEN}`);

			expect(res.status).toBe(500);
			expect(res.body.detail).toBe("The Portal API is not configured on this server");
		});
	});

	describe("rate limit", () => {
		it("answers 429 problem+json with Retry-After once the limit is passed", async () => {
			const app = appWith({ rateLimitPerMinute: 2 });

			await request(app).get("/v1/health");
			await request(app).get("/v1/health");
			const res = await request(app).get("/v1/health");

			expect(res.status).toBe(429);
			expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
			expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
			expect(res.body.type).toBe("urn:ondc:workbench:problem:rate-limited");
		});

		it("counts each token separately", async () => {
			const app = appWith({ rateLimitPerMinute: 1 });

			await request(app).get("/v1/health").set("Authorization", "Bearer a");
			const other = await request(app).get("/v1/health").set("Authorization", "Bearer b");

			expect(other.status).toBe(200);
		});
	});
});

describe("loadPortalConfig", () => {
	const withEnv = (env: Record<string, string | undefined>) => {
		const saved = { ...process.env };
		Object.assign(process.env, env);
		for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
		try {
			return loadPortalConfig();
		} finally {
			process.env = saved;
		}
	};

	it("rejects a missing or short token", () => {
		expect(withEnv({ PORTAL_API_TOKEN: undefined }).apiToken).toBeNull();
		expect(withEnv({ PORTAL_API_TOKEN: "short" }).tokenProblem).toMatch(/at least 32/);
	});

	it("accepts a long token and falls back to 120 requests a minute", () => {
		const config = withEnv({
			PORTAL_API_TOKEN: TOKEN,
			PORTAL_RATE_LIMIT_PER_MINUTE: "nonsense",
		});

		expect(config.apiToken).toBe(TOKEN);
		expect(config.rateLimitPerMinute).toBe(120);
	});
});
