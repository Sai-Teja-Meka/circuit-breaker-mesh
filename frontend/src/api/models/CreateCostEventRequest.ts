

/**
 * Input payload for recording a cost event.
 * The backend calculates the actual cost_usd based on the model.
 */
export type CreateCostEventRequest = {
	agent_id: string;
	model: string;
	tokens_prompt: number;
	tokens_completion: number;
};

