export const $AgentMetrics = {
	properties: {
		agent_id: {
	type: 'string',
	isRequired: true,
},
		tokens_consumed: {
	type: 'number',
},
		cost_usd: {
	type: 'string',
},
		api_calls_total: {
	type: 'number',
},
		api_calls_failed: {
	type: 'number',
},
		latency_ms: {
	type: 'number',
},
		latency_p95_ms: {
	type: 'number',
},
	},
} as const;