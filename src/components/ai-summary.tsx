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

  const { truncatedContent, shouldTruncate } = useMemo(() => {
    if (!content) return { truncatedContent: '', shouldTruncate: false };
    
    // Split by sentence endings - simplified approach
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // First try sentence-based truncation
    if (sentences.length > 2) {
      const truncated = sentences.slice(0, 2).join('. ') + '.';
      return { truncatedContent: truncated, shouldTruncate: true };
    }
    
    // Fallback: if content is very long (>300 chars), truncate by character count
    if (content.length > 300) {
      const truncated = content.substring(0, 300) + '...';
      return { truncatedContent: truncated, shouldTruncate: true };
    }
    
    return { truncatedContent: content, shouldTruncate: false };
  }, [content]);

  if (!content) return null;

  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <div className="font-semibold text-card-foreground mb-2">{title}</div>
      <div className="text-muted-foreground space-y-2">
        <div className="leading-relaxed">
          {shouldTruncate ? (isExpanded ? content : truncatedContent) : content}
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
