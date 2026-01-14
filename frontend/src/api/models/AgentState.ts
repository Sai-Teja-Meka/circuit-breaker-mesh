import type { AgentMetrics } from './AgentMetrics';
import type { AgentStatus } from './AgentStatus';
import type { AgentType } from './AgentType';
import type { CircuitBreakerState } from './CircuitBreakerState';

export type AgentState = {
	agent_id: string;
	agent_type: AgentType;
	status?: AgentStatus;
	current_task?: string | null;
	progress?: number;
	position_3d?: unknown[];
	metrics: AgentMetrics;
	circuit_breaker: CircuitBreakerState;
	created_at?: string;
	updated_at?: string;
};

