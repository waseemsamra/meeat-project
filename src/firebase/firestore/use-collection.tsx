'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or an infinite loop will occur.
 * Use useMemo to memoize it per React guidance.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The Firestore CollectionReference or Query. It MUST be memoized.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  // isLoading is true initially, and whenever the query changes, until the first snapshot is received.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If the query is null/undefined, we are not loading and have no data.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setError(null);
      setIsLoading(true); // Set to true as we are "loading" a non-existent query
      return;
    }
    
    // A new, valid query has been provided. Start loading.
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        
        setData(results);
        setError(null);
        // Once we get the first snapshot, we are no longer in the initial loading state.
        setIsLoading(false);
      },
      async (err: FirestoreError) => {
        // This is the new error handling block.
        let path = '';
        try {
           path =
            memoizedTargetRefOrQuery.type === 'collection'
              ? (memoizedTargetRefOrQuery as CollectionReference).path
              : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.toString()
        } catch (e) {
            console.warn("Could not determine path for Firestore error", e);
        }
        
        if (!path || path === '/') {
            const genericError = new Error("Firestore permission error on an invalid path. This is often due to an uninitialized query.");
            setError(genericError);
            console.error(genericError);
        } else {
            const contextualError = await FirestorePermissionError.create({
              operation: 'list',
              path: path,
            });
            setError(contextualError);
            // We emit the error to be caught by the global error boundary.
            errorEmitter.emit('permission-error', contextualError);
        }

        setData(null);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on component unmount or when the query changes.
    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // The effect re-runs ONLY when the memoized query object changes.

  return { data, isLoading, error };
}
