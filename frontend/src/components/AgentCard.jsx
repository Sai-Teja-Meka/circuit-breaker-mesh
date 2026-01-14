import React from 'react';

const AgentCard = ({ agentId, name, budgetUsed, budgetLimit, circuitStatus }) => {
  const isClosed = circuitStatus === 'closed';
  const isHalfOpen = circuitStatus === 'half_open';
  
  // Calculate percentage for progress bar
  const usagePercent = Math.min((budgetUsed / budgetLimit) * 100, 100);
  
  // Status badge color
  let statusColor = "bg-red-100 text-red-800"; // Open
  if (isClosed) statusColor = "bg-green-100 text-green-800";
  if (isHalfOpen) statusColor = "bg-yellow-100 text-yellow-800";

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-800 capitalize">{name}</h3>
          <p className="text-xs text-gray-500">ID: {agentId}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${statusColor}`}>
          {circuitStatus.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Budget Usage</span>
          <span className="font-mono text-gray-900">
            ${budgetUsed.toFixed(4)} / ${budgetLimit.toFixed(2)}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
