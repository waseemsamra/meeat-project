'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-2xl bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Application Error</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold">Something went wrong!</h2>
          <p className="mt-2 text-sm text-destructive">
            An unexpected error occurred. Please see the details below.
          </p>
          <pre className="mt-4 p-4 bg-background rounded-md text-xs whitespace-pre-wrap font-mono">
            {error.message}
          </pre>
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className="mt-6"
            variant="destructive"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
