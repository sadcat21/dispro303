import * as React from 'react';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdaptiveScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxHeightClassName?: string;
  dir?: 'rtl' | 'ltr';
}

export function AdaptiveScrollContainer({
  children,
  className,
  contentClassName,
  maxHeightClassName = 'max-h-[72dvh] sm:max-h-[78vh]',
  dir,
}: AdaptiveScrollContainerProps) {
  return (
    <div className={cn('min-h-0 overflow-hidden', maxHeightClassName)}>
      <ScrollArea
        className={cn(
          'h-full min-h-0 rounded-[inherit] overscroll-contain',
          className,
        )}
        dir={dir}
      >
        <div className={cn('min-w-0', contentClassName)}>{children}</div>
      </ScrollArea>
    </div>
  );
}

export default AdaptiveScrollContainer;
