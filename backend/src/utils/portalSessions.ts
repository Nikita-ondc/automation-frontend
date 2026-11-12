import { queryReader } from "./portalFlows";
import type { ProblemFieldError } from "./portalProblem";
import { toRfc3339 } from "./portalProblem";

/** The Portal API's session endpoints: list filters, SessionListItem and SessionDetail. */

export interface SessionsQuery {
	q?: string;
	status?: "active" | "expired";
	reportAvailable?: "true" | "false";
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
	reportExists: boolean;
	sessionType: "AUTOMATION" | "MANUAL";
	npType: "BAP" | "BPP";
	npId?: string | null;
	domain?: string | null;
	version?: string | null;
	usecaseId?: string | null;
	createdAt: string;
	lastActivityAt: string;
}

/** One session as automation-db returns it. Settings use Workbench's own names. */
export interface StoredSessionDetail extends StoredSession {
	orgId: string;
	expiresAt: string | null;
	flowSummary: {
		flowId: string;
		totalSteps: number;
		passedSteps: number;
		failedSteps: number;
		transactionIds: string[];
	}[];
	settings: Record<string, boolean> | null;
	settingsHistory: {
		changedAt: string;
		changedBy: string;
		changes: { setting: string; previousValue: boolean; newValue: boolean }[];
	}[];
}

/** Workbench's setting names, `headerValidaton` typo included, as the contract's. */
const SETTING_NAMES: Record<string, string> = {
	protocolValidations: "protocol_validation",
	headerValidaton: "header_validation",
	timeValidations: "time_validation",
	sensitiveTTL: "sensitive_ttl",
	useGateway: "use_gateway",
	stopAfterFirstNack: "stop_after_first_nack",
	useGzip: "use_gzip",
	encryptionValidation: "encryption_validation",
	useCare: "use_care",
	useTunnelForFIS: "use_tunnel",
};

const MAX_ORG_ID_LENGTH = 64;
const MAX_SESSION_ID_LENGTH = 128;
const RFC_3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;

export function parseSessionsQuery(
	raw: Record<string, unknown>,
	orgId: string
): { query: SessionsQuery; errors: ProblemFieldError[] } {
	const { errors, fail, single, list, choice, search } = queryReader(raw);

	if (orgId.length > MAX_ORG_ID_LENGTH) {
		fail("org_id", `must be at most ${MAX_ORG_ID_LENGTH} characters long`);
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
			reportAvailable: choice("report_available", ["true", "false"]),
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
	report_available: session.reportExists,
	session_type: session.sessionType,
	np_type: session.npType,
	subscriber_url: session.npId ?? "",
	domain: session.domain ?? null,
	version: session.version ?? null,
	usecase_id: session.usecaseId ?? null,
	created_at: toRfc3339(new Date(session.createdAt)),
	last_activity_at: toRfc3339(new Date(session.lastActivityAt)),
});

export const isValidSessionPath = (orgId: string, sessionId: string): boolean =>
	orgId.length <= MAX_ORG_ID_LENGTH && sessionId.length <= MAX_SESSION_ID_LENGTH;

const toContractSettings = (settings: Record<string, boolean>) =>
	Object.fromEntries(
		Object.entries(SETTING_NAMES)
			.filter(([stored]) => typeof settings[stored] === "boolean")
			.map(([stored, name]) => [name, settings[stored]])
	);

export const toSessionDetail = (session: StoredSessionDetail) => ({
	...toSessionListItem(session),
	org_id: session.orgId,
	expires_at: session.expiresAt && toRfc3339(new Date(session.expiresAt)),
	flow_summary: session.flowSummary.map((flow) => ({
		flow_id: flow.flowId,
		total_steps: flow.totalSteps,
		passed_steps: flow.passedSteps,
		failed_steps: flow.failedSteps,
		transaction_ids: flow.transactionIds,
	})),
	settings: session.settings && toContractSettings(session.settings),
	settings_history: session.settingsHistory.map((entry) => ({
		changed_at: toRfc3339(new Date(entry.changedAt)),
		changed_by: entry.changedBy,
		changes: entry.changes.map((change) => ({
			setting: SETTING_NAMES[change.setting] ?? change.setting,
			previous_value: change.previousValue,
			new_value: change.newValue,
		})),
	})),
});
