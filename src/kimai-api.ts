import type { ActiveTimesheet } from "./ActiveTimesheet";
import type { GlobalSettings } from "./GlobalSettings";

export type { ActiveTimesheet, GlobalSettings };

export function normalizeUrl(url: string): string {
	return url.replace(/\/$/, '');
}

export async function fetchActiveTimesheets(base: string, apiToken: string): Promise<ActiveTimesheet[]> {
	const res = await fetch(`${base}/api/timesheets/active`, {
		headers: { "Authorization": `Bearer ${apiToken}` }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json() as Promise<ActiveTimesheet[]>;
}
