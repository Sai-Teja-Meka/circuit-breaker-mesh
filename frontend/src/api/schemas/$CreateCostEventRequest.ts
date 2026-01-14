export const $CreateCostEventRequest = {
	description: `Input payload for recording a cost event.
The backend calculates the actual cost_usd based on the model.`,
	properties: {
		agent_id: {
	type: 'string',
	isRequired: true,
},
		model: {
	type: 'string',
	isRequired: true,
},
		tokens_prompt: {
	type: 'number',
	isRequired: true,
},
		tokens_completion: {
	type: 'number',
	isRequired: true,
},
	},
} as const;