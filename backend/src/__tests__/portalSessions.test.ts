import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { portalRoutes } from "../routes/portalRoutes";
import {
	parseSessionsQuery,
	toSessionListItem,
	type StoredSession,
} from "../utils/portalSessions";

/** GET /v1/organizations/{org_id}/sessions against a stand-in for automation-db. */

const TOKEN = "portal-test-token-0123456789abcdef";
const DB_KEY = "db-key";

const stored = (overrides: Partial<StoredSession> = {}): StoredSession => ({
	sessionId: "sess_1",
	userId: "25716",
	status: "active",
	result: "failed",
	sessionType: "AUTOMATION",
	npType: "BAP",
	npId: "https://buyer.example-np.in/ondc",
	domain: "ONDC:RET10",
	version: "1.2.5",
	usecaseId: "GROCERY",
	createdAt: "2026-10-20T09:12:44.123Z",
	lastActivityAt: "2026-10-21T08:03:10.456Z",
	...overrides,
});

describe("GET /v1/organizations/{org_id}/sessions", () => {
	let server: Server;
	let dbUrl: string;
	let received: { path: string; query: any; apiKey?: string }[];
	let reply: { sessions: StoredSession[]; hasMore: boolean };
	let failDb: boolean;

	beforeAll(() => {
		const db = express();
		db.use((req, res) => {
			received.push({ path: req.path, query: req.query, apiKey: req.get("x-api-key") });
			return failDb ? res.status(500).end() : res.json(reply);
		});
		server = db.listen(0);
		const address = server.address();
		dbUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
	});
	afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
	beforeEach(() => {
		received = [];
		reply = { sessions: [stored()], hasMore: false };
		failDb = false;
	});

	const unauthed = (url: string) => {
		const app = express();
		app.use(
			"/v1",
			portalRoutes({ apiToken: TOKEN, rateLimitPerMinute: 1000, dbServiceUrl: dbUrl, dbApiKey: DB_KEY })
		);
		return request(app).get(url);
	};
	const call = (url: string) => unauthed(url).set("Authorization", `Bearer ${TOKEN}`);

	it("needs the token", async () => {
		const res = await unauthed("/v1/organizations/org_1/sessions");

		expect(res.status).toBe(401);
		expect(received).toEqual([]);
	});

	it("returns sessions in the contract's format", async () => {
		reply.hasMore = true;

		const res = await call("/v1/organizations/org_1/sessions");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			data: [
				{
					session_id: "sess_1",
					user_id: "25716",
					status: "active",
					result: "failed",
					session_type: "AUTOMATION",
					np_type: "BAP",
					subscriber_url: "https://buyer.example-np.in/ondc",
					domain: "ONDC:RET10",
					version: "1.2.5",
					usecase_id: "GROCERY",
					created_at: "2026-10-20T09:12:44Z",
					last_activity_at: "2026-10-21T08:03:10Z",
				},
			],
			has_more: true,
		});
		expect(received[0].path).toBe("/api/sessions/portal/org_1");
		expect(received[0].apiKey).toBe(DB_KEY);
	});

	it("returns 200 and an empty list for an organisation with no sessions", async () => {
		reply.sessions = [];

		const res = await call("/v1/organizations/unknown/sessions");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ data: [], has_more: false });
	});

	it("passes every filter on to automation-db", async () => {
		await call(
			"/v1/organizations/org_1/sessions?q=buyer&status=active&result=failed&result=passed" +
				"&user_id=u1&domain=ONDC:RET10&domain=ONDC:RET11&version=1.2.5&usecase_id=GROCERY" +
				"&np_type=BAP&session_type=AUTOMATION&subscriber_url=https://b.example&flow_id=F1" +
				"&created_from=2026-10-01T00:00:00Z&created_to=2026-11-01T00:00:00Z" +
				"&last_activity_from=2026-10-15T00:00:00Z&last_activity_to=2026-10-22T00:00:00Z"
		);

		expect(received[0].query).toEqual({
			q: "buyer",
			status: "active",
			result: ["failed", "passed"],
			userId: "u1",
			domain: ["ONDC:RET10", "ONDC:RET11"],
			version: "1.2.5",
			usecaseId: "GROCERY",
			npType: "BAP",
			sessionType: "AUTOMATION",
			npId: "https://b.example",
			flowId: "F1",
			createdFrom: "2026-10-01T00:00:00Z",
			createdTo: "2026-11-01T00:00:00Z",
			lastActivityFrom: "2026-10-15T00:00:00Z",
			lastActivityTo: "2026-10-22T00:00:00Z",
		});
	});

	it("accepts the most repeats the contract allows", async () => {
		const flows = Array.from({ length: 50 }, (_, i) => `flow_id=F${i}`).join("&");

		const res = await call(`/v1/organizations/org_1/sessions?${flows}`);

		expect(res.status).toBe(200);
	});

	it("refuses bad filters without calling automation-db", async () => {
		const res = await call("/v1/organizations/org_1/sessions?status=open&np_type=buyer");

		expect(res.status).toBe(400);
		expect(res.type).toBe("application/problem+json");
		expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual([
			"/status",
			"/np_type",
		]);
		expect(received).toEqual([]);
	});

	it("refuses an org_id over 64 characters", async () => {
		const res = await call(`/v1/organizations/${"x".repeat(65)}/sessions`);

		expect(res.status).toBe(400);
		expect(res.body.errors[0].field).toBe("/org_id");
	});

	it("keeps an org_id with special characters in one path segment", async () => {
		await call("/v1/organizations/a%2Fb/sessions");

		expect(received[0].path).toBe("/api/sessions/portal/a%2Fb");
	});

	it("answers 500 as a problem when automation-db fails", async () => {
		failDb = true;

		const res = await call("/v1/organizations/org_1/sessions");

		expect(res.status).toBe(500);
		expect(res.type).toBe("application/problem+json");
	});
});

describe("parseSessionsQuery", () => {
	const errorsFor = (raw: Record<string, unknown>, orgId = "org_1") =>
		parseSessionsQuery(raw, orgId).errors.map((e) => e.field);

	it("needs no filters", () => {
		expect(errorsFor({})).toEqual([]);
	});

	it.each([
		["q", { q: "x" }],
		["q", { q: "x".repeat(101) }],
		["status", { status: ["active", "expired"] }],
		["result", { result: "unknown" }],
		["result", { result: ["passed", "nope"] }],
		["session_type", { session_type: "automation" }],
		["user_id", { user_id: Array(51).fill("u") }],
		["domain", { domain: Array(51).fill("d") }],
		["version", { version: Array(51).fill("v") }],
		["usecase_id", { usecase_id: Array(51).fill("u") }],
		["subscriber_url", { subscriber_url: Array(51).fill("s") }],
		["flow_id", { flow_id: Array(51).fill("f") }],
		["created_from", { created_from: "yesterday" }],
		["created_to", { created_to: "2026-10-01" }],
		["last_activity_from", { last_activity_from: "2026-13-45T00:00:00Z" }],
		["last_activity_to", { last_activity_to: "2026-10-01T00:00:00" }],
	])("refuses a bad %s", (name, raw) => {
		expect(errorsFor(raw)).toEqual([`/${name}`]);
	});

	it("needs a to time after its from time", () => {
		const at = "2026-10-01T00:00:00Z";

		expect(errorsFor({ created_from: at, created_to: at })).toEqual(["/created_to"]);
		expect(errorsFor({ last_activity_from: at, last_activity_to: at })).toEqual([
			"/last_activity_to",
		]);
	});

	it("accepts a time with an offset", () => {
		expect(errorsFor({ created_from: "2026-10-01T05:30:00+05:30" })).toEqual([]);
	});
});

describe("toSessionListItem", () => {
	it("keeps missing build fields as null", () => {
		const item = toSessionListItem(
			stored({ domain: undefined, version: null, usecaseId: undefined })
		);

		expect(item).toMatchObject({ domain: null, version: null, usecase_id: null });
	});
});
