

/**
 * Input payload for a complex multi-agent query.
 */
export type QueryRequest = {
	query: string;
	agent_id?: string;
	force_all_agents?: boolean;
};

