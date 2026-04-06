import React from 'react';
import { Badge } from '@/components/ui/badge';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileWarning, Phone, Calendar } from 'lucide-react';
import { usePendingDocuments } from '@/hooks/usePendingDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const PendingDocumentsSection: React.FC = () => {
  const { activeBranch } = useAuth();
  const { data: documents, isLoading } = usePendingDocuments(activeBranch?.id);

  if (isLoading || !documents || documents.length === 0) return null;

  const getDocLabel = (type: string) => {
    switch (type) {
      case 'check': return 'Chèque';
      case 'receipt': return 'Versement';
      case 'transfer': return 'Virement';
      default: return type;
    }
  };

  const getDocColor = (type: string) => {
    switch (type) {
      case 'check': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'receipt': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'transfer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return '';
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-amber-500" />
          المستندات المعلقة
          <Badge variant="destructive" className="text-xs">{documents.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.orderId}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CustomerSummary
                      customer={{ name: doc.customerName, phone: doc.customerPhone || undefined }}
                      compact
                      hideBadges
                      showAvatar={false}
                      showMeta={false}
                    />
                    <Badge className={`text-[10px] px-1.5 ${getDocColor(doc.documentType)}`}>
                      {getDocLabel(doc.documentType)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.customerPhone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Phone className="w-3 h-3" />
                        {doc.customerPhone}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: ar })}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold">{doc.orderTotal.toLocaleString()} DA</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PendingDocumentsSection;
