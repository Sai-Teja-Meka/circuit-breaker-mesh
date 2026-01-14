

/**
 * Input payload for sending a chat message to an agent (Structured messages list).
 */
export type ChatRequest = {
	messages: Array<Record<string, string>>;
};

