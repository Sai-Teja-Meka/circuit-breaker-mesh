export const $AgentState = {
	properties: {
		agent_id: {
	type: 'string',
	isRequired: true,
},
		agent_type: {
	type: 'AgentType',
	isRequired: true,
},
		status: {
	type: 'AgentStatus',
},
		current_task: {
	type: 'any-of',
	contains: [{
	type: 'string',
}, {
	type: 'null',
}],
},
		progress: {
	type: 'number',
	maximum: 1,
},
		position_3d: {
	type: 'unknown[]',
	maxItems: 3,
	minItems: 3,
},
		metrics: {
	type: 'AgentMetrics',
	isRequired: true,
},
		circuit_breaker: {
	type: 'CircuitBreakerState',
	isRequired: true,
},
		created_at: {
	type: 'string',
	format: 'date-time',
},
		updated_at: {
	type: 'string',
	format: 'date-time',
},
	},
} as const;