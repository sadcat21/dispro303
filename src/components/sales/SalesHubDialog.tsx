import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, ShoppingBag, ChevronLeft, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssignedOrders } from '@/hooks/useOrders';
import { OrderWithDetails, Product } from '@/types/database';
import DirectSaleDialog from '@/components/warehouse/DirectSaleDialog';
import DeliverySaleDialog from '@/components/orders/DeliverySaleDialog';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { format } from 'date-fns';

interface StockItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

interface SalesHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  stockSource?: 'worker' | 'warehouse';
  initialCustomerId?: string;
  initialTab?: 'direct' | 'delivery';
  initialDeliveryOrder?: OrderWithDetails | null;
  hideDirectTab?: boolean;
}

const SalesHubDialog: React.FC<SalesHubDialogProps> = ({
  open,
  onOpenChange,
  stockItems,
  stockSource = 'worker',
  initialCustomerId,
  initialTab = 'direct',
  initialDeliveryOrder = null,
  hideDirectTab = false,
}) => {
  const { t, dir } = useLanguage();
  const { data: assignedOrders = [], isLoading } = useAssignedOrders();
  const [activeTab, setActiveTab] = useState<'direct' | 'delivery'>(initialTab);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<OrderWithDetails | null>(initialDeliveryOrder);

  useEffect(() => {
    if (!open) {
      setSelectedDeliveryOrder(null);
      return;
    }
    if (hideDirectTab) {
      setActiveTab('delivery');
      setSelectedDeliveryOrder(initialDeliveryOrder || null);
      return;
    }
    setActiveTab(initialDeliveryOrder ? 'delivery' : initialTab);
    setSelectedDeliveryOrder(initialDeliveryOrder || null);
  }, [open, initialTab, initialDeliveryOrder, hideDirectTab]);

  useEffect(() => {
    if (hideDirectTab && activeTab === 'direct') {
      setActiveTab('delivery');
    }
  }, [hideDirectTab, activeTab]);

  const deliveryOrders = useMemo(
    () => assignedOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status || '')),
    [assignedOrders]
  );

  const statusLabel = (status?: string | null) => {
    switch (status) {
      case 'assigned':
        return t('orders.assigned');
      case 'in_progress':
        return t('orders.in_progress');
      case 'delivered':
        return t('orders.delivered');
      case 'cancelled':
        return t('orders.cancelled');
      default:
        return t('orders.pending');
    }
  };

  const statusColor = (status?: string | null) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col" dir={dir}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {t('sales.hub_title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = value as 'direct' | 'delivery';
            if (hideDirectTab) {
              setActiveTab('delivery');
              return;
            }
            setActiveTab(next);
            if (next !== 'delivery') setSelectedDeliveryOrder(null);
          }}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className={`grid mx-4 mt-3 shrink-0 ${hideDirectTab ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!hideDirectTab && (
              <TabsTrigger value="direct" className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                {t('stock.direct_sale')}
              </TabsTrigger>
            )}
            <TabsTrigger value="delivery" className="gap-2">
              <Truck className="w-4 h-4" />
              {t('orders.delivery_sale')}
            </TabsTrigger>
          </TabsList>

          {!hideDirectTab && (
            <TabsContent value="direct" className="p-0 mt-3 flex-1 min-h-0 flex flex-col">
              <DirectSaleDialog
                embedded
                hideHeader
                open={open}
                onOpenChange={onOpenChange}
                initialCustomerId={initialCustomerId}
                stockItems={stockItems}
                stockSource={stockSource}
              />
            </TabsContent>
          )}

          <TabsContent value="delivery" className="p-0 mt-3 flex-1 min-h-0 flex flex-col">
            {selectedDeliveryOrder ? (
              <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <div className="px-4 flex-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setSelectedDeliveryOrder(null)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('sales.back_to_list')}
                  </Button>
                </div>
                <DeliverySaleDialog
                  embedded
                  hideHeader
                  open={open}
                  onOpenChange={onOpenChange}
                  order={selectedDeliveryOrder}
                />
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : deliveryOrders.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t('deliveries.no_deliveries')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliveryOrders.map((order) => (
                      <button
                        key={order.id}
                        className="w-full text-right border rounded-xl p-3 hover:bg-muted/30 transition-colors"
                        onClick={() => setSelectedDeliveryOrder(order)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <CustomerSummary
                            customer={{
                              name: order.customer?.name,
                              store_name: order.customer?.store_name,
                              customer_type: order.customer?.customer_type,
                              sector_name: (order.customer as any)?.sector?.name,
                              phone: order.customer?.phone,
                              wilaya: order.customer?.wilaya,
                            }}
                            compact
                            showAvatar={false}
                            showMeta={false}
                          />
                          <Badge className={`text-[10px] ${statusColor(order.status)}`}>
                            {statusLabel(order.status)}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>
                          <span className="font-semibold text-foreground">
                            {Number(order.total_amount || 0).toLocaleString()} {t('common.currency')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SalesHubDialog;
