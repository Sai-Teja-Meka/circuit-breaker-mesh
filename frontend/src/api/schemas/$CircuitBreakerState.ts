export const $CircuitBreakerState = {
	properties: {
		agent_id: {
	type: 'string',
	isRequired: true,
},
		status: {
	type: 'CircuitStatus',
},
		failure_count: {
	type: 'number',
},
		budget_limit_usd: {
	type: 'string',
},
		budget_consumed_usd: {
	type: 'string',
},
		fallback_model: {
	type: 'string',
},
		last_failure_time: {
	type: 'any-of',
	contains: [{
	type: 'string',
	format: 'date-time',
}, {
	type: 'null',
}],
},
		reset_timeout_seconds: {
	type: 'number',
},
	},
} as const;