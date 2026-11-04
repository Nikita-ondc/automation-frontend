/**
 * Configuration for the Portal Integration API (/v1), the read-only API that
 * NP Portal calls. Contract: https://ondc-official.github.io/automation-framework/
 *
 * As with the business dashboard, a missing value must not take the rest of
 * this backend down. Health still answers without a token; every other /v1
 * route answers 500 until PORTAL_API_TOKEN is set.
 */

export interface PortalConfig {
	/** Shared secret NP Portal sends as a Bearer token; null when not configured. */
	apiToken: string | null;
	/** Why apiToken is null, for the log. */
	tokenProblem?: string;
	/** Requests allowed per caller per minute, health included. */
	rateLimitPerMinute: number;
	/** automation-db, checked by the health endpoint; null when not configured. */
	dbServiceUrl: string | null;
}

const DEFAULT_RATE_LIMIT_PER_MINUTE = 120;
const MIN_TOKEN_LENGTH = 32;

export function loadPortalConfig(): PortalConfig {
	const token = process.env.PORTAL_API_TOKEN?.trim() || null;
	let tokenProblem: string | undefined;
	if (!token) {
		tokenProblem = "PORTAL_API_TOKEN is not set";
	} else if (token.length < MIN_TOKEN_LENGTH) {
		// A short token can be guessed, and it unlocks every organisation's sessions.
		tokenProblem = `PORTAL_API_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters`;
	}

	const limit = Number(
		process.env.PORTAL_RATE_LIMIT_PER_MINUTE ?? DEFAULT_RATE_LIMIT_PER_MINUTE
	);

	return {
		apiToken: tokenProblem ? null : token,
		tokenProblem,
		rateLimitPerMinute:
			Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_RATE_LIMIT_PER_MINUTE,
		dbServiceUrl: process.env.DB_SERVICE?.trim().replace(/\/$/, "") || null,
	};
}
