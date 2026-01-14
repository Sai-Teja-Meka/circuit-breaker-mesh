import React from 'react';

/**
 * Skeleton loader for the Agent Status Card.
 * Matches dimensions of the real AgentCard component.
 */
export const AgentCardSkeleton = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-4 animate-pulse">
      {/* Header Row */}
      <div className="flex justify-between items-start mb-2">
        {/* Agent Name */}
        <div className="h-5 w-32 bg-gray-200 rounded"></div>
        
        {/* Status Badge */}
        <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
      </div>

      {/* ID Subtext */}
      <div className="h-3 w-20 bg-gray-100 rounded mb-4"></div>

      {/* Budget Section */}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between">
            <div className="h-3 w-16 bg-gray-200 rounded"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
        {/* Progress Bar */}
        <div className="h-2 w-full bg-gray-200 rounded mt-1"></div>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Chat Messages.
 * Simulates a text response being generated.
 */
export const MessageSkeleton = () => {
  return (
    <div className="flex w-full justify-start mb-4 animate-pulse">
      <div className="max-w-[80%] bg-white p-4 rounded-lg rounded-bl-none shadow-sm border border-gray-200 w-full md:w-96">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for the Right Panel Stats.
 */
export const StatsCardSkeleton = () => {
  return (
    <div className="bg-white p-4 rounded shadow-sm border border-gray-100 animate-pulse">
      {/* Label */}
      <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
      
      {/* Large Value */}
      <div className="h-8 w-20 bg-gray-200 rounded"></div>
    </div>
  );
};