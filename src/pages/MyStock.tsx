import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Loader2, ShoppingBag, TrendingDown, TrendingUp, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SalesHubDialog from '@/components/sales/SalesHubDialog';
import { useIsElementHidden } from '@/hooks/useUIOverrides';

const MyStock: React.FC = () => {
  const { t } = useLanguage();
  const { workerId } = useAuth();
  const [showSalesHubDialog, setShowSalesHubDialog] = useState(false);
  const isDirectSaleHidden = useIsElementHidden('button', 'stock_direct_sale');

  const { data: stockItems, isLoading } = useQuery({
    queryKey: ['my-worker-stock', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_stock')
        .select('*, product:products(*)')
        .eq('worker_id', workerId!)
        .gte('quantity', 0);

      if (error) throw error;
      return data;
    },
    enabled: !!workerId,
  });

  // Fetch the last completed accounting session date for this worker
  const { data: lastAccountingSession } = useQuery({
    queryKey: ['my-last-accounting', workerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('accounting_sessions')
        .select('completed_at')
        .eq('worker_id', workerId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      return data?.completed_at || null;
    },
    enabled: !!workerId,
  });

  const lastAccountingDate = lastAccountingSession || null;

  // Fetch loaded quantities from loading_session_items since last accounting
  const { data: loadedData } = useQuery({
    queryKey: ['my-stock-loaded', workerId, lastAccountingDate],
    queryFn: async () => {
      let sessionsQuery = supabase
        .from('loading_sessions')
        .select('id')
        .eq('worker_id', workerId!)
        .in('status', ['completed', 'open']);
      
      if (lastAccountingDate) {
        sessionsQuery = sessionsQuery.gte('created_at', lastAccountingDate);
      }

      const { data: sessions } = await sessionsQuery;
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map(s => s.id);
      const { data: items } = await supabase
        .from('loading_session_items')
        .select('product_id, quantity, gift_quantity, previous_quantity')
        .in('session_id', sessionIds);

      return items || [];
    },
    enabled: !!workerId,
  });

  // Fetch last review session quantities as fallback for رصيد
  const { data: reviewData } = useQuery({
    queryKey: ['my-stock-review', workerId, lastAccountingDate],
    queryFn: async () => {
      let reviewQuery = supabase
        .from('loading_sessions')
        .select('id')
        .eq('worker_id', workerId!)
        .eq('status', 'review')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastAccountingDate) {
        reviewQuery = reviewQuery.gte('created_at', lastAccountingDate);
      }

      const { data: sessions } = await reviewQuery;
      if (!sessions || sessions.length === 0) return [];

      const { data: items } = await supabase
        .from('loading_session_items')
        .select('product_id, quantity')
        .eq('session_id', sessions[0].id);

      return items || [];
    },
    enabled: !!workerId,
  });

  // Fetch sold quantities from delivered orders since last accounting
  const { data: soldData } = useQuery({
    queryKey: ['my-stock-sold', workerId, lastAccountingDate],
    queryFn: async () => {
      let ordersQuery = supabase
        .from('orders')
        .select('id')
        .eq('assigned_worker_id', workerId!)
        .eq('status', 'delivered');

      if (lastAccountingDate) {
        ordersQuery = ordersQuery.gte('created_at', lastAccountingDate);
      }

      const { data: orders } = await ordersQuery;
      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity, gift_quantity, gift_offer_id')
        .in('order_id', orderIds);

      if (!items || items.length === 0) return [];

      // Get unique offer IDs to fetch gift_quantity_unit
      const offerIds = [...new Set(items.map(i => i.gift_offer_id).filter(Boolean))] as string[];
      let offerUnits: Record<string, string> = {};
      if (offerIds.length > 0) {
        const { data: tiers } = await supabase
          .from('product_offer_tiers')
          .select('offer_id, gift_quantity_unit')
          .in('offer_id', offerIds);
        for (const t of (tiers || [])) {
          offerUnits[t.offer_id] = t.gift_quantity_unit || 'piece';
        }
      }

      return items.map(i => ({
        ...i,
        gift_unit: i.gift_offer_id ? (offerUnits[i.gift_offer_id] || 'piece') : 'piece',
      }));
    },
    enabled: !!workerId,
  });

  // Build review quantities map (fallback for products not in loading sessions)
  const reviewQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of (reviewData || [])) {
      map[item.product_id] = (map[item.product_id] || 0) + item.quantity;
    }
    return map;
  }, [reviewData]);

  // Calculate loaded per product from loading sessions
  const movementStats = useMemo(() => {
    const stats: Record<string, { loaded: number; totalLoad: number; sold: number }> = {};
    for (const item of (loadedData || [])) {
      if (!stats[item.product_id]) stats[item.product_id] = { loaded: 0, totalLoad: 0, sold: 0 };
      stats[item.product_id].loaded += item.quantity + (item.gift_quantity || 0);
      stats[item.product_id].totalLoad += (item.previous_quantity || 0) + item.quantity + (item.gift_quantity || 0);
    }
    for (const item of (soldData || [])) {
      if (!stats[item.product_id]) stats[item.product_id] = { loaded: 0, totalLoad: 0, sold: 0 };
      // Subtract gift quantities from sold to show only paid sales
      stats[item.product_id].sold += item.quantity - (item.gift_quantity || 0);
    }
    return stats;
  }, [loadedData, soldData]);

  // Calculate gifts per product from both loading sessions and delivered orders
  const giftStats = useMemo(() => {
    const stats: Record<string, { totalGifts: number; unit: string }> = {};
    
    // Gifts from loading sessions (loaded as gifts for distribution)
    for (const item of (loadedData || [])) {
      if ((item.gift_quantity || 0) > 0) {
        const pid = item.product_id;
        const unit = (item as any).gift_unit || 'piece';
        if (!stats[pid]) stats[pid] = { totalGifts: 0, unit };
        stats[pid].totalGifts += item.gift_quantity;
        // Use the unit from loading session
        stats[pid].unit = unit;
      }
    }
    
    // Also add gifts from delivered orders (given to customers)
    for (const item of (soldData || [])) {
      if ((item.gift_quantity || 0) > 0) {
        const pid = item.product_id;
        const unit = (item as any).gift_unit || 'piece';
        if (!stats[pid]) stats[pid] = { totalGifts: 0, unit };
        stats[pid].totalGifts += item.gift_quantity;
      }
    }
    return stats;
  }, [loadedData, soldData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasStock = stockItems && stockItems.length > 0;

  // Sort: items with stock first, then zero-quantity items
  const sortedItems = [...(stockItems || [])].sort((a, b) => {
    if (a.quantity === 0 && b.quantity > 0) return 1;
    if (a.quantity > 0 && b.quantity === 0) return -1;
    return ((a as any).product?.name || '').localeCompare((b as any).product?.name || '');
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {t('stock.my_stock')}
        </h2>
        {hasStock && !isDirectSaleHidden && (
          <Button size="sm" onClick={() => setShowSalesHubDialog(true)}>
            <ShoppingBag className="w-4 h-4 ml-1" />
            {t('stock.direct_sale')}
          </Button>
        )}
      </div>

      {!hasStock ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('stock.no_stock')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {sortedItems.map(item => {
            const isZero = item.quantity === 0;
            const stats = movementStats[item.product_id];
            const loaded = stats?.loaded || 0;
            const totalLoad = stats?.totalLoad || reviewQuantities[item.product_id] || item.quantity;
            const sold = stats?.sold || 0;
            const gifts = giftStats[item.product_id];
            const giftQty = gifts?.totalGifts || 0;
            const giftUnit = gifts?.unit === 'piece' ? t('stock.piece') : gifts?.unit === 'box' ? t('stock.box') : gifts?.unit === 'kg' ? 'kg' : t('stock.piece');
            return (
              <Card key={item.id} className={isZero ? 'bg-destructive/10 border-destructive/30' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {(item as any).product?.name}
                    </span>
                    <span className={`font-bold text-lg ${isZero ? 'text-destructive' : 'text-primary'}`}>
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs border-t pt-1.5 mt-1 flex-wrap">
                    <span className="flex items-center gap-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                      <Package className="w-3 h-3" />
                      {t('stock.balance')}: {totalLoad}
                    </span>
                    <span className="flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      <TrendingUp className="w-3 h-3" />
                      {t('stock.loaded')}: {loaded}
                    </span>
                    <span className="flex items-center gap-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                      <TrendingDown className="w-3 h-3" />
                      {t('stock.sold_label')}: {sold}
                    </span>
                    {giftQty > 0 && (
                      <span className="flex items-center gap-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                        <Gift className="w-3 h-3" />
                        {t('stock.gifts_label')}: {giftQty} {giftUnit}
                      </span>
                    )}
                    <span className="font-bold bg-muted px-1.5 py-0.5 rounded">{t('stock.remaining_label')}: {item.quantity}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SalesHubDialog
        open={showSalesHubDialog}
        onOpenChange={setShowSalesHubDialog}
        initialTab="direct"
        stockSource="worker"
        stockItems={(stockItems || []).map(s => ({
          id: s.id,
          product_id: s.product_id,
          quantity: s.quantity,
          product: (s as any).product,
        }))}
      />
    </div>
  );
};

export default MyStock;
