import { Request, Response } from "express";
import axios from "axios";
import type { PortalConfig } from "../config/portalConfig";
import { toRfc3339 } from "../utils/portalProblem";

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
