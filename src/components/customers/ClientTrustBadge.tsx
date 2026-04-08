import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ClientTrustScoreResult } from '@/utils/clientTrustScore';

interface ClientTrustBadgeProps {
  trust: ClientTrustScoreResult | null | undefined;
  compact?: boolean;
}

const ClientTrustBadge: React.FC<ClientTrustBadgeProps> = ({ trust, compact = false }) => {
  const { language } = useLanguage();
  if (!trust) return null;

  const toneClass =
    trust.tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : trust.tone === 'medium'
        ? 'bg-orange-50 text-orange-700 border-orange-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border font-semibold',
        toneClass,
        compact ? 'h-5 px-2 text-[10px]' : 'h-6 px-2.5 text-xs',
      )}
      title={language === 'fr' ? trust.labelFr : trust.labelAr}
    >
      {trust.score}%
    </Badge>
  );
};

export default ClientTrustBadge;
