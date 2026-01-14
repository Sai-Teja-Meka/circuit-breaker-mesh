export const $CostEvent = {
	properties: {
		event_id: {
	type: 'string',
},
		agent_id: {
	type: 'string',
	isRequired: true,
},
		model_used: {
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
		cost_usd: {
	type: 'string',
	isRequired: true,
},
		timestamp: {
	type: 'string',
	format: 'date-time',
},
	},
} as const;