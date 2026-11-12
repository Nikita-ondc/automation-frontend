import { createHash, timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import logger from "@ondc/automation-logger";
import type { PortalConfig } from "../config/portalConfig";
import { sendProblem } from "../utils/portalProblem";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time comparison, so response time says nothing about the token. */
const sameToken = (sent: string, expected: string) =>
	timingSafeEqual(digest(sent), digest(expected));

/**
 * Lets a request through only with `Authorization: Bearer <PORTAL_API_TOKEN>`.
 * The contract leaves the auth mechanism TBD; this shared token stands in
 * until it is agreed with NP Portal.
 */
export const requirePortalToken =
	(config: PortalConfig) =>
	(req: Request, res: Response, next: NextFunction): void => {
		if (!config.apiToken) {
			logger.error(`Portal API request refused: ${config.tokenProblem}`);
			sendProblem(res, 500, "The Portal API is not configured on this server");
			return;
		}
		const match = /^Bearer\s+(\S+)$/i.exec(req.get("Authorization") ?? "");
		if (!match || !sameToken(match[1], config.apiToken)) {
			res.setHeader("WWW-Authenticate", "Bearer");
			sendProblem(res, 401, "Missing or invalid token");
			return;
		}
		next();
	};
