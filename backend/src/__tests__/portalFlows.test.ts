import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { portalRoutes } from "../routes/portalRoutes";
import { parseFlowsQuery, sortFlows, toFlowMeta, type StoredFlow } from "../utils/portalFlows";

/**
 * GET /v1/flows against a stand-in for automation-db. Mounted on a bare express
 * app rather than app.ts, which would drag in Redis and the OTel SDK.
 */

const TOKEN = "portal-test-token-0123456789abcdef";
const DB_KEY = "db-key";

const stored = (flowId: string, overrides: Partial<StoredFlow> = {}): StoredFlow => ({
	flowId,
	domain: "ONDC:RET10",
	version: "1.2.5",
	usecase: "GROCERY",
	description: `About ${flowId}`,
	tags: ["core"],
	config: {
		meta: { flowName: `Title ${flowId}` },
		steps: [
			{ action_id: "search", api: "search", owner: "BAP", description: "Find", unsolicited: false, responseFor: null },
			{ action_id: "on_search", api: "on_search", owner: "BPP", description: "Catalog", unsolicited: false, responseFor: "search" },
		],
	},
	...overrides,
});

describe("GET /v1/flows", () => {
	let server: Server;
	let dbUrl: string;
	let received: { path: string; query: any; apiKey?: string }[];
	let flows: StoredFlow[];
	let scope: Record<string, unknown> | null;
	let failDb: boolean;

	beforeAll(() => {
		const db = express();
		db.use((req, res) => {
			received.push({ path: req.path, query: req.query, apiKey: req.get("x-api-key") });
			if (failDb) return res.status(500).end();
			if (req.path === "/protocol-specs/flows") return res.json({ flows });
			return scope ? res.json(scope) : res.status(404).end();
		});
		server = db.listen(0);
		const address = server.address();
		dbUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
	});
	afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
	beforeEach(() => {
		received = [];
		flows = [stored("ORDER_FLOW")];
		scope = null;
		failDb = false;
	});

	const call = (url: string) => {
		const app = express();
		app.use(
			"/v1",
			portalRoutes({ apiToken: TOKEN, rateLimitPerMinute: 1000, dbServiceUrl: dbUrl, dbApiKey: DB_KEY })
		);
		return request(app).get(url).set("Authorization", `Bearer ${TOKEN}`);
	};

	it("needs the token", async () => {
		const app = express();
		app.use("/v1", portalRoutes({ apiToken: TOKEN, rateLimitPerMinute: 10, dbServiceUrl: dbUrl, dbApiKey: DB_KEY }));

		expect((await request(app).get("/v1/flows")).status).toBe(401);
		expect(received).toHaveLength(0);
	});

	it("returns flows in the contract's shape", async () => {
		const res = await call("/v1/flows");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			data: [
				{
					flow_id: "ORDER_FLOW",
					domain: "ONDC:RET10",
					version: "1.2.5",
					usecase_id: "GROCERY",
					title: "Title ORDER_FLOW",
					description: "About ORDER_FLOW",
					tags: ["core"],
					total_steps: 2,
					steps: [
						{ step_key: "search", action: "search", owner: "BAP", label: null, description: "Find", unsolicited: false, pair_step_key: "on_search" },
						{ step_key: "on_search", action: "on_search", owner: "BPP", label: null, description: "Catalog", unsolicited: false, pair_step_key: "search" },
					],
				},
			],
		});
	});

	it("answers an empty list when nothing matches", async () => {
		flows = [];

		const res = await call("/v1/flows?domain=ONDC:NONE");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ data: [] });
	});

	it("passes every filter on to automation-db with its key", async () => {
		await call(
			"/v1/flows?domain=A&domain=B&version=1&usecase_id=U&flow_id=F&tag=t1&tag=t2&tag_match=all&action=cancel&q=order"
		);

		expect(received[0].apiKey).toBe(DB_KEY);
		expect(received[0].query).toEqual({
			domain: ["A", "B"],
			version: "1",
			usecase: "U",
			flowId: "F",
			tag: ["t1", "t2"],
			tagMatch: "all",
			action: "cancel",
			q: "order",
		});
	});

	it("answers 400 with the fields at fault, without calling automation-db", async () => {
		const res = await call("/v1/flows?q=x&sort=nope&order=up&tag_match=some");

		expect(res.status).toBe(400);
		expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
		expect(res.body.type).toBe("urn:ondc:workbench:problem:validation-failed");
		expect(res.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
			"/order",
			"/q",
			"/sort",
			"/tag_match",
		]);
		expect(received).toHaveLength(0);
	});

	it("accepts up to the contract's limit, past the query parser's limit of 20", async () => {
		const flowIds = Array.from({ length: 100 }, (_, i) => `flow_id=F${i}`).join("&");

		expect((await call(`/v1/flows?${flowIds}`)).status).toBe(200);
		// The stand-in's own parser reshapes a long list; the values all arrive.
		expect(Object.values(received[0].query.flowId)).toHaveLength(100);
	});

	it("says how many values are allowed when there are too many", async () => {
		const tags = Array.from({ length: 21 }, () => "tag=t").join("&");

		const res = await call(`/v1/flows?${tags}`);

		expect(res.status).toBe(400);
		expect(res.body.errors).toEqual([{ field: "/tag", message: "must have at most 20 values" }]);
	});

	it("applies the session's domain, version and use case", async () => {
		scope = { orgId: "11899", domain: "ONDC:RET11", version: "1.2.0", usecaseId: "F&B" };

		const res = await call("/v1/flows?session_id=s-1");

		expect(res.status).toBe(200);
		expect(received[0].path).toBe("/api/sessions/s-1/portal-scope");
		expect(received[1].query).toMatchObject({ domain: "ONDC:RET11", version: "1.2.0", usecase: "F&B" });
	});

	it("answers an empty list when other filters exclude the session's build", async () => {
		scope = { orgId: "11899", domain: "ONDC:RET11", version: "1.2.0", usecaseId: "F&B" };

		const res = await call("/v1/flows?session_id=s-1&domain=ONDC:RET10");

		expect(res.body).toEqual({ data: [] });
		expect(received).toHaveLength(1);
	});

	it("answers 404 for an unknown session or one with no organisation", async () => {
		expect((await call("/v1/flows?session_id=nope")).status).toBe(404);

		scope = { domain: "ONDC:RET11", version: "1.2.0", usecaseId: "F&B" };
		const res = await call("/v1/flows?session_id=no-org");

		expect(res.status).toBe(404);
		expect(res.body.type).toBe("urn:ondc:workbench:problem:not-found");
	});

	it("answers 500 problem+json when automation-db fails", async () => {
		failDb = true;

		const res = await call("/v1/flows");

		expect(res.status).toBe(500);
		expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
		expect(JSON.stringify(res.body)).not.toContain("127.0.0.1");
	});
});

describe("parseFlowsQuery", () => {
	it("uses the contract's defaults", () => {
		const { query, errors } = parseFlowsQuery({});

		expect(errors).toEqual([]);
		expect(query).toMatchObject({ tagMatch: "any", sort: "flow_id", order: "asc" });
	});

	it("refuses too many values and repeated single values", () => {
		const { errors } = parseFlowsQuery({
			tag: Array(21).fill("t"),
			flow_id: Array(101).fill("f"),
			q: ["ab", "cd"],
		});

		expect(errors.map((e) => e.field).sort()).toEqual(["/flow_id", "/q", "/tag"]);
	});
});

describe("toFlowMeta", () => {
	const steps = (...list: [string, string, string | null][]) =>
		list.map(([action_id, api, responseFor]) => ({ action_id, api, owner: "BAP" as const, responseFor }));

	it("keeps form steps, and gives a null title when the flow has none", () => {
		const meta = toFlowMeta(
			stored("F", { config: { steps: steps(["form_1", "html_form", null], ["form_2", "dynamic_form", null]) } })
		);

		expect(meta.title).toBeNull();
		expect(meta.total_steps).toBe(2);
		expect(meta.steps.map((s) => s.action)).toEqual(["html_form", "dynamic_form"]);
		expect(meta.steps[0]).toMatchObject({ description: null, unsolicited: false, pair_step_key: null });
	});

	it("gives null when a step answers a step that does not exist", () => {
		const meta = toFlowMeta(stored("F", { config: { steps: steps(["on_x", "on_x", "x_missing"]) } }));

		expect(meta.steps[0].pair_step_key).toBeNull();
	});
});

describe("sortFlows", () => {
	const meta = (flowId: string, flowName?: string, stepCount = 0, domain = "D") =>
		toFlowMeta(
			stored(flowId, {
				domain,
				config: {
					meta: { flowName },
					steps: Array.from({ length: stepCount }, (_, i) => ({ action_id: `s${i}`, api: "search", owner: "BAP" as const })),
				},
			})
		);
	const ids = (list: { flow_id: string }[]) => list.map((f) => f.flow_id);

	it("sorts by flow ID by default direction and reverses with desc", () => {
		const list = [meta("B"), meta("A")];

		expect(ids(sortFlows(list, "flow_id", "asc"))).toEqual(["A", "B"]);
		expect(ids(sortFlows(list, "flow_id", "desc"))).toEqual(["B", "A"]);
	});

	it("sorts by total steps", () => {
		expect(ids(sortFlows([meta("A", "x", 3), meta("B", "y", 1)], "total_steps", "asc"))).toEqual(["B", "A"]);
	});

	it("keeps untitled flows last in both directions", () => {
		const list = [meta("none"), meta("A", "Apple"), meta("B", "Banana")];

		expect(ids(sortFlows(list, "title", "asc"))).toEqual(["A", "B", "none"]);
		expect(ids(sortFlows(list, "title", "desc"))).toEqual(["B", "A", "none"]);
	});

	it("breaks ties by domain, then flow ID", () => {
		const list = [meta("B", "T", 1, "D2"), meta("Z", "T", 1, "D1"), meta("A", "T", 1, "D1")];

		expect(ids(sortFlows(list, "title", "asc"))).toEqual(["A", "Z", "B"]);
	});
});
