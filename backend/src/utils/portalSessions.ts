import { queryReader } from "./portalFlows";
import type { ProblemFieldError } from "./portalProblem";
import { toRfc3339 } from "./portalProblem";

/** GET /v1/organizations/{org_id}/sessions: its filters, and SessionListItem. */

export interface SessionsQuery {
	q?: string;
	status?: "active" | "expired";
	results?: string[];
	userIds?: string[];
	domains?: string[];
	versions?: string[];
	usecaseIds?: string[];
	npType?: "BAP" | "BPP";
	sessionType?: "AUTOMATION" | "MANUAL";
	subscriberUrls?: string[];
	flowIds?: string[];
	createdFrom?: string;
	createdTo?: string;
	lastActivityFrom?: string;
	lastActivityTo?: string;
}

/** A session as automation-db's organisation list returns it. */
export interface StoredSession {
	sessionId: string;
	userId?: string | null;
	status: "active" | "expired";
	result: "passed" | "failed" | "incomplete";
	sessionType: "AUTOMATION" | "MANUAL";
	npType: "BAP" | "BPP";
	npId?: string | null;
	domain?: string | null;
	version?: string | null;
	usecaseId?: string | null;
	createdAt: string;
	lastActivityAt: string;
}

const MAX_ORG_ID_LENGTH = 64;
const RESULTS = ["passed", "failed", "incomplete"];
const RFC_3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;

export function parseSessionsQuery(
	raw: Record<string, unknown>,
	orgId: string
): { query: SessionsQuery; errors: ProblemFieldError[] } {
	const { errors, fail, single, list, choice, search } = queryReader(raw);

	if (orgId.length > MAX_ORG_ID_LENGTH) {
		fail("org_id", `must be at most ${MAX_ORG_ID_LENGTH} characters long`);
	}

	const results = list("result", RESULTS.length);
	if (results?.some((result) => !RESULTS.includes(result))) {
		fail("result", `must be one of: ${RESULTS.join(", ")}`);
	}

	const instant = (name: string): string | undefined => {
		const value = single(name);
		return value !== undefined && (!RFC_3339.test(value) || isNaN(Date.parse(value)))
			? fail(name, "must be an RFC 3339 date-time, e.g. 2026-10-01T00:00:00Z")
			: value;
	};
	const span = (fromName: string, toName: string) => {
		const from = instant(fromName);
		const to = instant(toName);
		if (from && to && Date.parse(to) <= Date.parse(from)) {
			fail(toName, `must be after ${fromName}`);
		}
		return [from, to];
	};
	const [createdFrom, createdTo] = span("created_from", "created_to");
	const [lastActivityFrom, lastActivityTo] = span("last_activity_from", "last_activity_to");

	return {
		query: {
			q: search("q"),
			status: choice("status", ["active", "expired"]),
			results,
			userIds: list("user_id", 50),
			domains: list("domain", 50),
			versions: list("version", 50),
			usecaseIds: list("usecase_id", 50),
			npType: choice("np_type", ["BAP", "BPP"]),
			sessionType: choice("session_type", ["AUTOMATION", "MANUAL"]),
			subscriberUrls: list("subscriber_url", 50),
			flowIds: list("flow_id", 50),
			createdFrom,
			createdTo,
			lastActivityFrom,
			lastActivityTo,
		},
		errors,
	};
}

export const toSessionListItem = (session: StoredSession) => ({
	session_id: session.sessionId,
	user_id: session.userId ?? "",
	status: session.status,
	result: session.result,
	session_type: session.sessionType,
	np_type: session.npType,
	subscriber_url: session.npId ?? "",
	domain: session.domain ?? null,
	version: session.version ?? null,
	usecase_id: session.usecaseId ?? null,
	created_at: toRfc3339(new Date(session.createdAt)),
	last_activity_at: toRfc3339(new Date(session.lastActivityAt)),
});
