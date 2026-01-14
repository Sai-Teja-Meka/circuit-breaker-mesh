

export type CostEvent = {
	event_id?: string;
	agent_id: string;
	model_used: string;
	tokens_prompt: number;
	tokens_completion: number;
	cost_usd: string;
	timestamp?: string;
};

