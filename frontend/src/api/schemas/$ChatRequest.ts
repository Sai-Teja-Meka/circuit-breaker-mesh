export const $ChatRequest = {
	description: `Input payload for sending a chat message to an agent (Structured messages list).`,
	properties: {
		messages: {
	type: 'array',
	contains: {
	type: 'dictionary',
	contains: {
	type: 'string',
},
},
	isRequired: true,
},
	},
} as const;