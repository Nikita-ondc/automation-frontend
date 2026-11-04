import { NextFunction, Request, Response } from "express";
import axios from "axios";
import type { PortalConfig } from "../config/portalConfig";
import { fetchFlows, fetchSessionScope } from "../services/portalDbService";
import { parseFlowsQuery, readQuery, sortFlows, toFlowMeta } from "../utils/portalFlows";
import { sendProblem, toRfc3339 } from "../utils/portalProblem";

const DB_HEALTH_TIMEOUT_MS = 2000;

/**
 * GET /v1/health. Every data endpoint reads from automation-db, so the API is
 * `degraded` (still 200, as the contract has no other status) when it cannot
 * be reached.
 */
export const getHealth = (config: PortalConfig) => async (_req: Request, res: Response) => {
	let status: "ok" | "degraded" = "ok";
	if (!config.dbServiceUrl) {
		status = "degraded";
	} else {
		try {
			await axios.get(`${config.dbServiceUrl}/health`, { timeout: DB_HEALTH_TIMEOUT_MS });
		} catch {
			status = "degraded";
		}
	}
	res.json({ status, timestamp: toRfc3339(new Date()) });
};

/**
 * GET /v1/flows. With session_id, the session's domain, version and use case
 * are added to the other filters. A session with no organisation belongs to
 * nobody NP Portal can see, so it is treated as not found.
 */
export const listFlows =
	(config: PortalConfig) => async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { query, errors } = parseFlowsQuery(readQuery(req.originalUrl));
			if (errors.length) {
				sendProblem(res, 400, "One or more filters are invalid", errors);
				return;
			}

			if (query.sessionId) {
				const scope = await fetchSessionScope(config, query.sessionId);
				if (!scope?.orgId) {
					sendProblem(res, 404, "Session not found");
					return;
				}
				const narrow = (filter: string[] | undefined, value?: string | null) =>
					!value || (filter && !filter.includes(value)) ? null : [value];
				const domains = narrow(query.domains, scope.domain);
				const versions = narrow(query.versions, scope.version);
				const usecases = narrow(query.usecases, scope.usecaseId);
				if (!domains || !versions || !usecases) {
					res.json({ data: [] });
					return;
				}
				Object.assign(query, { domains, versions, usecases });
			}

			const flows = (await fetchFlows(config, query)).map(toFlowMeta);
			res.json({ data: sortFlows(flows, query.sort, query.order) });
		} catch (e) {
			next(e);
		}
	};
