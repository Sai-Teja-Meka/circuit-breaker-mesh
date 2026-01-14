import type { CircuitStatus } from './CircuitStatus';

export type CircuitBreakerState = {
	agent_id: string;
	status?: CircuitStatus;
	failure_count?: number;
	budget_limit_usd?: string;
	budget_consumed_usd?: string;
	fallback_model?: string;
	last_failure_time?: string | null;
	reset_timeout_seconds?: number;
};

