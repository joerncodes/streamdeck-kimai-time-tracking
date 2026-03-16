import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { fetchActiveTimesheets, GlobalSettings, normalizeUrl } from "../kimai-api";

@action({ UUID: "com.joerncodes.kimai-time-tracking.stop" })
export class StopTracking extends SingletonAction {
	override async onWillAppear(ev: WillAppearEvent): Promise<void> {
		if (ev.action.isKey()) await this.syncState(ev.action);
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		const { kimaiUrl, apiToken } = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		if (!kimaiUrl || !apiToken) {
			await ev.action.showAlert();
			return;
		}

		const base = normalizeUrl(kimaiUrl);

		try {
			const active = await fetchActiveTimesheets(base, apiToken);

			if (active.length === 0) {
				await ev.action.showAlert();
				await sleep(2000);
				return;
			}

			await Promise.all(active.map(t =>
				fetch(`${base}/api/timesheets/${t.id}/stop`, {
					method: "PATCH",
					headers: { "Authorization": `Bearer ${apiToken}` }
				})
			));

			await ev.action.showOk();
			await sleep(2000);
			if (ev.action.isKey()) await this.syncState(ev.action);
		} catch (e) {
			streamDeck.logger.error("Failed to stop time tracking:", e);
			await ev.action.showAlert();
		}
	}

	private async syncState(action: ActionContext): Promise<void> {
		const { kimaiUrl, apiToken } = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		if (!kimaiUrl || !apiToken) {
			await action.setTitle("");
			return;
		}

		try {
			const active = await fetchActiveTimesheets(normalizeUrl(kimaiUrl), apiToken);
			await action.setState(active.length > 0 ? 1 : 0);
		} catch {
			await action.setState(0);
		}
	}
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type ActionContext = KeyAction;
