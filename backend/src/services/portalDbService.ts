import axios from "axios";
import type { PortalConfig } from "../config/portalConfig";
import type { FlowsQuery, StoredFlow } from "../utils/portalFlows";
import type { SessionsQuery, StoredSession, StoredSessionDetail } from "../utils/portalSessions";

/** Internal automation-db routes behind the Portal Integration API. */

export interface SessionScope {
	orgId?: string | null;
	domain?: string | null;
	version?: string | null;
	usecaseId?: string | null;
}

const dbRequest = (config: PortalConfig) => {
	if (!config.dbServiceUrl) {
		throw new Error("DB_SERVICE is not set");
	}
	return axios.create({
		baseURL: config.dbServiceUrl,
		headers: { "x-api-key": config.dbApiKey ?? "" },
		// Repeats a list as ?domain=A&domain=B, the form automation-db reads.
		paramsSerializer: { indexes: null },
	});
};

export const fetchFlows = async (
	config: PortalConfig,
	query: FlowsQuery
): Promise<StoredFlow[]> => {
	const response = await dbRequest(config).get("/protocol-specs/flows", {
		params: {
			domain: query.domains,
			version: query.versions,
			usecase: query.usecases,
			flowId: query.flowIds,
			tag: query.tags,
			tagMatch: query.tagMatch,
			action: query.actions,
			q: query.q,
		},
	});
	return response.data.flows;
};

export const fetchSessions = async (
	config: PortalConfig,
	orgId: string,
	query: SessionsQuery
): Promise<{ sessions: StoredSession[]; hasMore: boolean }> => {
	const response = await dbRequest(config).get(
		`/api/sessions/portal/${encodeURIComponent(orgId)}`,
		{
			params: {
				q: query.q,
				status: query.status,
				result: query.results,
				userId: query.userIds,
				domain: query.domains,
				version: query.versions,
				usecaseId: query.usecaseIds,
				npType: query.npType,
				sessionType: query.sessionType,
				npId: query.subscriberUrls,
				flowId: query.flowIds,
				createdFrom: query.createdFrom,
				createdTo: query.createdTo,
				lastActivityFrom: query.lastActivityFrom,
				lastActivityTo: query.lastActivityTo,
			},
		}
	);
	return response.data;
};

/** The company's session, or null if it has no such session. */
export const fetchSession = async (
	config: PortalConfig,
	orgId: string,
	sessionId: string
): Promise<StoredSessionDetail | null> => {
	try {
		const response = await dbRequest(config).get(
			`/api/sessions/portal/${encodeURIComponent(orgId)}/${encodeURIComponent(sessionId)}`
		);
		return response.data;
	} catch (e: any) {
		if (e?.response?.status === 404) {
			return null;
		}
		throw e;
	}
};

/** The session's organisation and build, or null if there is no such session. */
export const fetchSessionScope = async (
	config: PortalConfig,
	sessionId: string
): Promise<SessionScope | null> => {
	try {
		const response = await dbRequest(config).get(
			`/api/sessions/${encodeURIComponent(sessionId)}/portal-scope`
		);
		return response.data;
	} catch (e: any) {
		if (e?.response?.status === 404) {
			return null;
		}
		throw e;
	}
};
