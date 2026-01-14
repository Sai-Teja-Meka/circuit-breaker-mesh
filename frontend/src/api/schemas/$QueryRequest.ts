export const $QueryRequest = {
	description: `Input payload for a complex multi-agent query.`,
	properties: {
		query: {
	type: 'string',
	isRequired: true,
},
		agent_id: {
	type: 'string',
},
		force_all_agents: {
	type: 'boolean',
},
	},
} as const;