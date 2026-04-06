import React from 'react';
import CustomerLabel, { CustomerLabelData, CustomerTypeEntry } from '@/components/customers/CustomerLabel';
import { cn } from '@/lib/utils';

export interface CustomerSummaryData extends CustomerLabelData {
  phone?: string | null;
  wilaya?: string | null;
}

interface CustomerSummaryProps {
  customer: CustomerSummaryData;
  compact?: boolean;
  hideBadges?: boolean;
  showAvatar?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Optional metadata line (e.g. phone • wilaya). */
  meta?: React.ReactNode;
  showMeta?: boolean;
  /** Extra badges beside the name (e.g. credit, payment type). */
  badges?: React.ReactNode;
  /** Footer area below meta (e.g. payment badges row). */
  footer?: React.ReactNode;
  /** Slot on the far edge (e.g. edit button). */
  rightSlot?: React.ReactNode;
  /** Override customer types to avoid extra queries when parent already has them */
  customerTypes?: CustomerTypeEntry[];
}

const avatarClasses: Record<NonNullable<CustomerSummaryProps['avatarSize']>, string> = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const CustomerSummary: React.FC<CustomerSummaryProps> = ({
  customer,
  compact = false,
  hideBadges = false,
  showAvatar = true,
  avatarSize = 'md',
  className,
  meta,
  showMeta = !compact,
  badges,
  footer,
  rightSlot,
  customerTypes,
}) => {
  const displayInitial = (customer.store_name || customer.name || '?').charAt(0);
  const defaultMeta = [customer.phone, customer.wilaya].filter(Boolean).join(' • ');
  const metaContent = meta ?? (defaultMeta ? <span>{defaultMeta}</span> : null);

  return (
    <div className={cn('flex items-start gap-2', className)}>
      {showAvatar && (
        <div
          className={cn(
            'rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0',
            avatarClasses[avatarSize]
          )}
        >
          {displayInitial || '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CustomerLabel
            customer={customer}
            compact={compact}
            hideBadges={hideBadges}
            customerTypes={customerTypes}
          />
          {badges}
        </div>
        {showMeta && metaContent && (
          <p className="text-xs text-muted-foreground mt-0.5">{metaContent}</p>
        )}
        {footer}
      </div>
      {rightSlot}
    </div>
  );
};

export default CustomerSummary;
