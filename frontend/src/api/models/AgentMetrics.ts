

export type AgentMetrics = {
	agent_id: string;
	tokens_consumed?: number;
	cost_usd?: string;
	api_calls_total?: number;
	api_calls_failed?: number;
	latency_ms?: number;
	latency_p95_ms?: number;
};

