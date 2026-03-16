import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

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

		const base = kimaiUrl.replace(/\/$/, '');

		try {
			const res = await fetch(`${base}/api/timesheets/active`, {
				headers: { "Authorization": `Bearer ${apiToken}` }
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const active = await res.json() as { id: number }[];

			if (active.length === 0) {
				await ev.action.showAlert();
				return;
			}

			await Promise.all(active.map(t =>
				fetch(`${base}/api/timesheets/${t.id}/stop`, {
					method: "PATCH",
					headers: { "Authorization": `Bearer ${apiToken}` }
				})
			));

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
			const res = await fetch(`${kimaiUrl.replace(/\/$/, '')}/api/timesheets/active`, {
				headers: { "Authorization": `Bearer ${apiToken}` }
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const active = await res.json() as unknown[];

			if (active.length > 0) {
				await action.setState(1);
				await action.setTitle("● Active");
			} else {
				await action.setState(0);
				await action.setTitle("");
			}
		} catch {
			await action.setTitle("");
		}
	}
}

type ActionContext = KeyAction;

type GlobalSettings = {
	kimaiUrl?: string;
	apiToken?: string;
};
