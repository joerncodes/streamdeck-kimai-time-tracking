export type ActiveTimesheet = {
	id: number;
	project: { id: number };
	activity: { id: number };
	begin: string;
};
