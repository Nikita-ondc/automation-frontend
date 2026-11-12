import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

const MAX_LENGTH = 128;
// Printable ASCII without spaces, so the ID is safe to echo in a header and a log.
const SAFE_ID = /^[\x21-\x7e]+$/;

/**
 * Echoes the caller's X-Request-Id, or makes one, so NP Portal can quote it
 * when reporting a problem. An unusable ID is replaced rather than rejected.
 */
export const portalRequestId = (req: Request, res: Response, next: NextFunction): void => {
	const sent = req.get("X-Request-Id")?.trim();
	const requestId =
		sent && sent.length <= MAX_LENGTH && SAFE_ID.test(sent) ? sent : randomUUID();
	res.locals.requestId = requestId;
	res.setHeader("X-Request-Id", requestId);
	next();
};
