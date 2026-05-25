import React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { GamificationEmptyState } from './GamificationEmptyState';
import { GamificationErrorState } from './GamificationErrorState';

interface GamificationQueryStateProps<T> {
  query: Pick<UseQueryResult<T>, 'isLoading' | 'isError' | 'isFetching' | 'refetch' | 'data'>;
  isEmpty?: (data: T | undefined) => boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  children: (data: T) => React.ReactNode;
}

export function GamificationQueryState<T>({
  query,
  isEmpty,
  loadingMessage = 'Loading gamification…',
  emptyTitle,
  emptyDescription,
  children,
}: GamificationQueryStateProps<T>) {
  const { isLoading, isError, isFetching, refetch, data } = query;

  if (isLoading && data === undefined) {
    return <p className="text-sm text-gray-500 text-center py-8">{loadingMessage}</p>;
  }

  if (isError) {
    return <GamificationErrorState onRetry={() => refetch()} />;
  }

  if (data !== undefined && isEmpty?.(data)) {
    return (
      <GamificationEmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  if (data === undefined) {
    return <GamificationEmptyState />;
  }

  return (
    <>
      {isFetching && !isLoading ? (
        <p className="text-xs text-gray-400 text-right mb-2">Updating…</p>
      ) : null}
      {children(data)}
    </>
  );
}
