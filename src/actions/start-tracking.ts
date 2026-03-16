import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.joerncodes.kimai-time-tracking.increment" })
export class StartTracking extends SingletonAction<ActionSettings> {
	override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
		if (ev.action.isKey()) await this.syncState(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
		const settings = ev.payload.settings;

		if (settings.timesheetId) {
			await this.stopTracking(ev.action, settings);
		} else {
			await this.startTracking(ev.action, settings);
		}
	}

	private async startTracking(action: ActionContext, settings: ActionSettings): Promise<void> {
		const { projectId, activityId } = settings;
		if (!projectId || !activityId) {
			await action.showAlert();
			return;
		}

		const { kimaiUrl, apiToken } = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		if (!kimaiUrl || !apiToken) {
			await action.showAlert();
			return;
		}

		try {
			const res = await fetch(`${kimaiUrl.replace(/\/$/, '')}/api/timesheets`, {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${apiToken}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					project: Number(projectId),
					activity: Number(activityId),
					begin: new Date().toISOString()
				})
			});

			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const timesheet = await res.json() as { id: number };

			const updated = { ...settings, timesheetId: timesheet.id };
			await action.setSettings(updated);
			await this.syncState(action, updated);
		} catch (e) {
			streamDeck.logger.error("Failed to start time tracking:", e);
			await action.showAlert();
		}
	}

	private async stopTracking(action: ActionContext, settings: ActionSettings): Promise<void> {
		const { kimaiUrl, apiToken } = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		if (!kimaiUrl || !apiToken) {
			await action.showAlert();
			return;
		}

		try {
			const res = await fetch(`${kimaiUrl.replace(/\/$/, '')}/api/timesheets/${settings.timesheetId}/stop`, {
				method: "PATCH",
				headers: { "Authorization": `Bearer ${apiToken}` }
			});

			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const updated = { ...settings, timesheetId: undefined };
			await action.setSettings(updated);
			await this.syncState(action, updated);
		} catch (e) {
			streamDeck.logger.error("Failed to stop time tracking:", e);
			await action.showAlert();
		}
	}

	private async syncState(action: ActionContext, settings: ActionSettings): Promise<void> {
		if (settings.timesheetId) {
			await action.setState(1);
			await action.setTitle("● Running");
		} else {
			await action.setState(0);
			await action.setTitle("");
		}
	}
}

type ActionContext = KeyAction<ActionSettings>;

type ActionSettings = {
	projectId?: string;
	activityId?: string;
	timesheetId?: number;
};

type GlobalSettings = {
	kimaiUrl?: string;
	apiToken?: string;
};
