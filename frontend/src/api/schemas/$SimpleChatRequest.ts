export const $SimpleChatRequest = {
	description: `Simple chat input - just a query string.`,
	properties: {
		query: {
	type: 'string',
	isRequired: true,
},
		agent_id: {
	type: 'string',
},
	},
} as const;