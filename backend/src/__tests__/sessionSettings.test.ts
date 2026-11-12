import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

/** What a session's settings save sends to automation-db for the Portal API. */

// utils/axios validates these at import time and throws without them.
for (const key of [
	"API_SERVICE",
	"DB_SERVICE",
	"CONFIG_SERVICE",
	"MOCK_SERVICE",
	"REPORTING_SERVICE",
	"API_SERVICE_KEY",
]) {
	process.env[key] = process.env[key] ?? `http://localhost/${key}`;
}

const upsertSessionInDb = vi.fn().mockResolvedValue({});
const saveSessionSettingsInDb = vi.fn().mockResolvedValue(undefined);
vi.mock("../services/dbService", () => ({
	upsertSessionInDb: (...args: unknown[]) => upsertSessionInDb(...args),
	saveSessionSettingsInDb: (...args: unknown[]) => saveSessionSettingsInDb(...args),
}));

const { RedisService } = await import("@ondc/ondc-automation-cache-lib");
const { settingChanges, updateSessionService } = await import("../services/sessionService");
const { resolveChangedBy } = await import("../services/sessionOwnerService");

const SESSION_ID = "session-under-test";

const STARTING = {
	sensitiveTTL: true,
	useGateway: false,
	stopAfterFirstNack: true,
	protocolValidations: true,
	timeValidations: true,
	headerValidaton: true,
	useGzip: false,
};

const seedSession = () => {
	RedisService.__reset();
	RedisService.__store.set(
		SESSION_ID,
		JSON.stringify({ npType: "BAP", sessionDifficulty: STARTING })
	);
};

const flushed = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("settingChanges", () => {
	it("lists only settings whose value changed", () => {
		expect(settingChanges(STARTING, { ...STARTING, useGateway: true })).toEqual([
			{ setting: "useGateway", previousValue: false, newValue: true },
		]);
	});

	it("is empty when nothing changed", () => {
		expect(settingChanges(STARTING, { ...STARTING })).toEqual([]);
	});

	it("does not count a never-saved setting arriving as off", () => {
		expect(settingChanges(STARTING, { ...STARTING, useCare: false })).toEqual([]);
	});

	it("counts a never-saved setting arriving as on", () => {
		expect(settingChanges(STARTING, { ...STARTING, useCare: true })).toEqual([
			{ setting: "useCare", previousValue: false, newValue: true },
		]);
	});

	it("ignores values that are not on or off", () => {
		expect(settingChanges({}, { totalDifficulty: 5 } as never)).toEqual([]);
	});
});

describe("updateSessionService settings", () => {
	beforeEach(() => {
		seedSession();
		upsertSessionInDb.mockClear();
		saveSessionSettingsInDb.mockClear();
		saveSessionSettingsInDb.mockResolvedValue(undefined);
		delete process.env.DEVELOPER_GUIDE_SERVICE;
	});

	it("records the change as anonymous when no one is logged in", async () => {
		const next = { ...STARTING, useGateway: true };

		await updateSessionService(SESSION_ID, { sessionDifficulty: next }, {});
		await flushed();

		expect(saveSessionSettingsInDb).toHaveBeenCalledWith(SESSION_ID, {
			settings: next,
			changes: [{ setting: "useGateway", previousValue: false, newValue: true }],
			changedBy: "anonymous",
		});
	});

	it("saves the settings with no change when nothing changed", async () => {
		await updateSessionService(SESSION_ID, { sessionDifficulty: { ...STARTING } }, {});
		await flushed();

		expect(saveSessionSettingsInDb).toHaveBeenCalledWith(SESSION_ID, {
			settings: STARTING,
			changes: [],
			changedBy: undefined,
		});
	});

	it("saves nothing when the update is not about settings", async () => {
		await updateSessionService(SESSION_ID, { activeFlow: "FLOW_A" }, {});
		await flushed();

		expect(saveSessionSettingsInDb).not.toHaveBeenCalled();
	});

	it("still saves the session when recording the settings fails", async () => {
		saveSessionSettingsInDb.mockRejectedValue(new Error("db down"));
		const next = { ...STARTING, useGzip: true };

		await expect(
			updateSessionService(SESSION_ID, { sessionDifficulty: next }, {})
		).resolves.toBe("Session updated successfully");
		await flushed();

		const saved = JSON.parse(RedisService.__store.get(SESSION_ID) as string);
		expect(saved.sessionDifficulty).toEqual(next);
	});
});

describe("resolveChangedBy", () => {
	beforeEach(() => {
		process.env.DEVELOPER_GUIDE_SERVICE = "http://login.test";
		vi.restoreAllMocks();
	});

	it("uses the logged-in user", async () => {
		const get = vi
			.spyOn(axios, "get")
			.mockResolvedValue({ data: { user: { username: "25716" } } });

		expect(await resolveChangedBy("Bearer pass", {})).toBe("25716");
		expect(get).toHaveBeenCalledWith(
			"http://login.test/auth/api/me",
			expect.objectContaining({ headers: { Authorization: "Bearer pass" } })
		);
	});

	it("is anonymous with no login pass", async () => {
		expect(await resolveChangedBy(undefined, {})).toBe("anonymous");
	});

	it("is anonymous when the login service refuses", async () => {
		vi.spyOn(axios, "get").mockRejectedValue(new Error("401"));

		expect(await resolveChangedBy("Bearer old", {})).toBe("anonymous");
	});
});
