'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AISummaryProps {
  title: string;
  content: string;
  className?: string;
}

export function AISummary({ title, content, className = '' }: AISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = content && content.length > 200;

  if (!content) return null;

  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <div className="font-semibold text-card-foreground mb-2">{title}</div>
      <div className="text-muted-foreground space-y-2">
        <div className={`leading-relaxed ${shouldTruncate && !isExpanded ? 'line-clamp-3' : ''}`}>
          {content}
        </div>
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-0 text-sm font-normal"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show more
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
