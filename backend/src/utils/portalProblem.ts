import { Response } from "express";

/**
 * Error bodies for the Portal Integration API, per RFC 9457 (Problem Details).
 * The contract says `type` is stable and safe to branch on, so it is a URN per
 * error kind rather than a URL that would have to be hosted somewhere.
 */

export const PROBLEM_TYPE_PREFIX = "urn:ondc:workbench:problem:";

export interface ProblemFieldError {
	/** JSON Pointer to the offending field or query parameter, e.g. `/domain`. */
	field: string;
	message: string;
}

const PROBLEMS: Record<number, { kind: string; title: string }> = {
	400: { kind: "validation-failed", title: "Bad request" },
	401: { kind: "unauthorized", title: "Unauthorized" },
	403: { kind: "forbidden", title: "Forbidden" },
	404: { kind: "not-found", title: "Not found" },
	429: { kind: "rate-limited", title: "Too many requests" },
	500: { kind: "internal", title: "Internal server error" },
};

export function sendProblem(
	res: Response,
	status: keyof typeof PROBLEMS,
	detail?: string,
	errors?: ProblemFieldError[]
): void {
	const { kind, title } = PROBLEMS[status];
	res
		.status(status)
		.type("application/problem+json")
		.json({
			type: PROBLEM_TYPE_PREFIX + kind,
			title,
			status,
			...(detail ? { detail } : {}),
			...(res.locals.requestId ? { instance: res.locals.requestId } : {}),
			...(errors?.length ? { errors } : {}),
		});
}

/** RFC 3339 in UTC without milliseconds, as in the contract's examples. */
export const toRfc3339 = (date: Date): string =>
	date.toISOString().replace(/\.\d{3}Z$/, "Z");
