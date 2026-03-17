import type { KeyAction } from "@elgato/streamdeck";

export type ActionSettings = {
	projectId?: string;
	activityId?: string;
	timesheetId?: number;
	label?: string;
};

export type ActionContext = KeyAction<ActionSettings>;
