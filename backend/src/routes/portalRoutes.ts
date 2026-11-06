import { createHash } from "node:crypto";
import { NextFunction, Request, Response, Router } from "express";
import rateLimit from "express-rate-limit";
import logger from "@ondc/automation-logger";
import { loadPortalConfig, type PortalConfig } from "../config/portalConfig";
import { getHealth, listFlows, listSessions } from "../controllers/portalController";
import { requirePortalToken } from "../middlewares/portalAuth";
import { portalRequestId } from "../middlewares/portalRequestId";
import { sendProblem } from "../utils/portalProblem";

/**
 * Portal Integration API, mounted at /v1. Read-only API for NP Portal.
 * Contract: https://ondc-official.github.io/automation-framework/
 *
 * Exported as a factory so tests can mount it on a bare express app without
 * dragging in Redis and OpenTelemetry via app.ts.
 */
export function portalRoutes(config: PortalConfig): Router {
	const router = Router();

	router.use(portalRequestId);

	// Keyed by token, not IP: behind the ingress every caller shares one IP.
	router.use(
		rateLimit({
			windowMs: 60 * 1000,
			limit: config.rateLimitPerMinute,
			standardHeaders: "draft-7",
			legacyHeaders: false,
			keyGenerator: (req) => {
				const auth = req.get("Authorization");
				return auth
					? `token:${createHash("sha256").update(auth).digest("hex")}`
					: `ip:${req.ip}`;
			},
			handler: (_req, res) => sendProblem(res, 429, "Rate limit exceeded"),
		})
	);

	router.get("/health", getHealth(config));

	// Everything below this line needs the token, including unknown paths.
	router.use(requirePortalToken(config));

	router.get("/flows", listFlows(config));
	router.get("/organizations/:org_id/sessions", listSessions(config));

	router.use((req: Request, res: Response) =>
		sendProblem(res, 404, `No such endpoint: ${req.method} ${req.baseUrl}${req.path}`)
	);

	router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
		logger.error("Portal API request failed", { requestId: res.locals.requestId }, err);
		sendProblem(res, 500);
	});

	return router;
}

/**
 * Config is resolved on first request rather than at import time, because this
 * module is loaded via app.ts before index.ts gets to call dotenv.config().
 */
let delegate: Router | null = null;

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => {
	if (!delegate) {
		const config = loadPortalConfig();
		if (config.tokenProblem) {
			logger.error(
				`Portal API data routes are disabled: ${config.tokenProblem}. Health still answers.`
			);
		}
		delegate = portalRoutes(config);
	}
	delegate(req, res, next);
});

export default router;
