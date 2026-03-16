import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.joerncodes.kimai-time-tracking.increment" })
export class StartTracking extends SingletonAction<ActionSettings> {
	private pollingInterval: ReturnType<typeof setInterval> | null = null;
	private readonly trackedActions = new Map<string, KeyAction<ActionSettings>>();

	override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.trackedActions.set(ev.action.id, ev.action);
		this.startPolling();
		await this.poll();
	}

	override async onWillDisappear(ev: WillDisappearEvent<ActionSettings>): Promise<void> {
		this.trackedActions.delete(ev.action.id);
		if (this.trackedActions.size === 0) {
			this.stopPolling();
		}
	}

	override async onKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
		const settings = ev.payload.settings;

		if (settings.timesheetId) {
			await this.stopTracking(ev.action, settings);
		} else {
			await this.startTracking(ev.action, settings);
		}
	}

	private startPolling(): void {
		if (this.pollingInterval) return;
		this.pollingInterval = setInterval(() => this.poll(), 5000);
	}

	private stopPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
			this.pollingInterval = null;
		}
	}

	private async poll(): Promise<void> {
		const { kimaiUrl, apiToken } = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		if (!kimaiUrl || !apiToken) return;

		let active: ActiveTimesheet[] = [];
		try {
			const res = await fetch(`${kimaiUrl.replace(/\/$/, '')}/api/timesheets/active`, {
				headers: { "Authorization": `Bearer ${apiToken}` }
			});
			if (!res.ok) return;
			active = await res.json() as ActiveTimesheet[];
		} catch (e) {
			streamDeck.logger.error("Poll error:", e);
			return;
		}

		streamDeck.logger.info("Active timesheets:", JSON.stringify(active));

		for (const [, keyAction] of this.trackedActions) {
			const settings = await keyAction.getSettings();
			const matching = active.find(t =>
				t.project.id === Number(settings.projectId) &&
				t.activity.id === Number(settings.activityId)
			);

			if (matching) {
				const elapsed = formatElapsed(matching.begin);
				streamDeck.logger.info(`begin=${matching.begin} elapsed=${elapsed}`);
				await keyAction.setState(1);
				await keyAction.setTitle(`● ${elapsed}`);
				if (settings.timesheetId !== matching.id) {
					await keyAction.setSettings({ ...settings, timesheetId: matching.id });
				}
			} else {
				if (settings.timesheetId !== undefined) {
					await keyAction.setSettings({ ...settings, timesheetId: undefined });
				}
				await keyAction.setState(0);
				await keyAction.setTitle("");
			}
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
			await this.poll();
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
			await this.poll();
		} catch (e) {
			streamDeck.logger.error("Failed to stop time tracking:", e);
			await action.showAlert();
		}
	}
}

function formatElapsed(begin: string): string {
	const elapsed = Math.floor((Date.now() - new Date(begin).getTime()) / 1000);
	const h = Math.floor(elapsed / 3600);
	const m = Math.floor((elapsed % 3600) / 60);
	const s = elapsed % 60;
	if (h > 0) {
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}
	return `${m}:${String(s).padStart(2, '0')}`;
}

type ActionContext = KeyAction<ActionSettings>;

type ActiveTimesheet = {
	id: number;
	project: { id: number };
	activity: { id: number };
	begin: string;
};

type ActionSettings = {
	projectId?: string;
	activityId?: string;
	timesheetId?: number;
};

type GlobalSettings = {
	kimaiUrl?: string;
	apiToken?: string;
};
