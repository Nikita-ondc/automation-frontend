import type { ProblemFieldError } from "./portalProblem";

/** GET /v1/flows: its filters, and flows as the contract's FlowMeta. */

export interface FlowsQuery {
	sessionId?: string;
	q?: string;
	domains?: string[];
	versions?: string[];
	usecases?: string[];
	flowIds?: string[];
	tags?: string[];
	tagMatch: "any" | "all";
	actions?: string[];
	sort: "flow_id" | "title" | "total_steps";
	order: "asc" | "desc";
}

interface StoredStep {
	action_id: string;
	api: string;
	owner: "BAP" | "BPP";
	description?: string | null;
	unsolicited?: boolean;
	responseFor?: string | null;
}

/** A flow as automation-db's catalog returns it. */
export interface StoredFlow {
	flowId: string;
	domain: string;
	version: string;
	usecase: string;
	description?: string;
	tags?: string[];
	config?: { meta?: { flowName?: string }; steps?: StoredStep[] };
}

export interface FlowMeta {
	flow_id: string;
	domain: string;
	version: string;
	usecase_id: string;
	title: string | null;
	description: string;
	tags: string[];
	total_steps: number;
	steps: {
		step_key: string;
		action: string;
		owner: "BAP" | "BPP";
		label: string | null;
		description: string | null;
		unsolicited: boolean;
		pair_step_key: string | null;
	}[];
}

const MAX_SESSION_ID_LENGTH = 128;

/**
 * The query string as text, a repeated parameter as a list. Not req.query: its
 * parser turns a parameter repeated more than 20 times into an object, and the
 * contract allows up to 100 flow_id values.
 */
export function readQuery(originalUrl: string): Record<string, string | string[]> {
	const params = new URLSearchParams(originalUrl.split("?")[1] ?? "");
	const query: Record<string, string | string[]> = {};
	for (const name of new Set(params.keys())) {
		const values = params.getAll(name);
		query[name] = values.length > 1 ? values : values[0];
	}
	return query;
}

export function parseFlowsQuery(raw: Record<string, unknown>): {
	query: FlowsQuery;
	errors: ProblemFieldError[];
} {
	const errors: ProblemFieldError[] = [];
	const fail = (name: string, message: string) => {
		errors.push({ field: `/${name}`, message });
		return undefined;
	};

	const single = (name: string): string | undefined => {
		const value = raw[name];
		if (value === undefined) return undefined;
		return typeof value === "string" && value !== ""
			? value
			: fail(name, "must be a single non-empty value");
	};

	const list = (name: string, max: number): string[] | undefined => {
		const value = raw[name];
		if (value === undefined) return undefined;
		const values = Array.isArray(value) ? value : [value];
		if (values.some((v) => typeof v !== "string" || v === "")) {
			return fail(name, "must be non-empty text");
		}
		return values.length > max
			? fail(name, `must have at most ${max} values`)
			: (values as string[]);
	};

	const choice = <T extends string>(name: string, allowed: T[], fallback: T): T => {
		const value = single(name);
		if (value === undefined) return fallback;
		if ((allowed as string[]).includes(value)) return value as T;
		fail(name, `must be one of: ${allowed.join(", ")}`);
		return fallback;
	};

	const q = single("q");
	if (q !== undefined && (q.length < 2 || q.length > 100)) {
		fail("q", "must be 2 to 100 characters long");
	}
	const sessionId = single("session_id");
	if (sessionId !== undefined && sessionId.length > MAX_SESSION_ID_LENGTH) {
		fail("session_id", `must be at most ${MAX_SESSION_ID_LENGTH} characters long`);
	}

	return {
		query: {
			sessionId,
			q,
			domains: list("domain", 50),
			versions: list("version", 50),
			usecases: list("usecase_id", 50),
			flowIds: list("flow_id", 100),
			tags: list("tag", 20),
			tagMatch: choice("tag_match", ["any", "all"], "any"),
			actions: list("action", 20),
			sort: choice("sort", ["flow_id", "title", "total_steps"], "flow_id"),
			order: choice("order", ["asc", "desc"], "asc"),
		},
		errors,
	};
}

export function toFlowMeta(flow: StoredFlow): FlowMeta {
	const steps = flow.config?.steps ?? [];
	const keys = new Set(steps.map((step) => step.action_id));

	return {
		flow_id: flow.flowId,
		domain: flow.domain,
		version: flow.version,
		usecase_id: flow.usecase,
		title: flow.config?.meta?.flowName ?? null,
		description: flow.description ?? "",
		tags: flow.tags ?? [],
		total_steps: steps.length,
		steps: steps.map((step) => {
			const reply = steps.find((s) => s.responseFor === step.action_id);
			const request =
				step.responseFor && keys.has(step.responseFor) ? step.responseFor : null;
			return {
				step_key: step.action_id,
				action: step.api,
				owner: step.owner,
				// Steps carry no separate label in the specs.
				label: null,
				description: step.description ?? null,
				unsolicited: step.unsolicited === true,
				pair_step_key: reply?.action_id ?? request,
			};
		}),
	};
}

const compareText = (a: string, b: string) => a.localeCompare(b);

/** Sorts by the chosen field, then as the contract says. Untitled flows go last. */
export function sortFlows(
	flows: FlowMeta[],
	sort: FlowsQuery["sort"],
	order: FlowsQuery["order"]
): FlowMeta[] {
	const direction = order === "desc" ? -1 : 1;
	const bySortField = (a: FlowMeta, b: FlowMeta) => {
		if (sort === "total_steps") return direction * (a.total_steps - b.total_steps);
		if (sort === "flow_id") return direction * compareText(a.flow_id, b.flow_id);
		if (a.title === null || b.title === null) {
			return Number(a.title === null) - Number(b.title === null);
		}
		return direction * compareText(a.title, b.title);
	};

	return [...flows].sort(
		(a, b) =>
			bySortField(a, b) ||
			compareText(a.domain, b.domain) ||
			compareText(a.version, b.version) ||
			compareText(a.usecase_id, b.usecase_id) ||
			compareText(a.flow_id, b.flow_id)
	);
}
