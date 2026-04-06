import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Package, Users, Loader2, ShoppingBag, Search, BarChart3, ChevronDown, ChevronUp, ClipboardList, Truck, ClipboardCheck } from 'lucide-react';
import { boxesToBP } from '@/utils/boxPieceInput';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWarehouseStock } from '@/hooks/useWarehouseStock';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SalesHubDialog from '@/components/sales/SalesHubDialog';
import QuickReceiptDialog from '@/components/warehouse/QuickReceiptDialog';
import QuickLoadWorkerDialog from '@/components/warehouse/QuickLoadWorkerDialog';
import BranchPalletCard from '@/components/stock/BranchPalletCard';
import WarehouseReviewDialog from '@/components/warehouse/WarehouseReviewDialog';
import WarehouseReviewHistory from '@/components/warehouse/WarehouseReviewHistory';
import { useIsElementHidden } from '@/hooks/useUIOverrides';

interface ProductSummary {
  productId: string;
  productName: string;
  received: number;
  workerStock: number;
  sold: number;
  gifts: number;
  damaged: number;
  factoryReturn: number;
  compensation: number;
  surplus: number;
  deficit: number;
  remaining: number;
}

const WarehouseStock: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeBranch } = useAuth();
  const { warehouseStock, workerStocksByWorker, isLoading, products, workers, createReceipt, loadToWorker } = useWarehouseStock();
  const [showSalesHubDialog, setShowSalesHubDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showLoadWorkerDialog, setShowLoadWorkerDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [expandedWorkers, setExpandedWorkers] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const isDirectSaleHidden = useIsElementHidden('button', 'warehouse_direct_sale');
  const isQuickLoadHidden = useIsElementHidden('button', 'warehouse_quick_load');
  const isFactoryDeliveryHidden = useIsElementHidden('button', 'warehouse_factory_delivery');

  const branchId = activeBranch?.id;

  // Fetch aggregated data for summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['warehouse-product-summary', branchId],
    queryFn: async () => {
      if (!branchId) return { receipts: [], movements: [], discrepancies: [], workerStocks: [], warehouseDamaged: [] };

      // First get receipt IDs for this branch
      const { data: branchReceipts } = await supabase
        .from('stock_receipts')
        .select('id')
        .eq('branch_id', branchId);
      
      const receiptIds = (branchReceipts || []).map(r => r.id);

      const [receiptsRes, discrepanciesRes, workerStocksRes, warehouseRes] = await Promise.all([
        // Total received per product (filter by receipt IDs)
        receiptIds.length > 0
          ? supabase
              .from('stock_receipt_items')
              .select('product_id, quantity')
              .in('receipt_id', receiptIds)
          : Promise.resolve({ data: [], error: null }),
        // Discrepancies (surplus, deficit)
        supabase
          .from('stock_discrepancies')
          .select('product_id, quantity, discrepancy_type')
          .eq('branch_id', branchId),
        // Worker stocks
        supabase
          .from('worker_stock')
          .select('product_id, quantity')
          .eq('branch_id', branchId),
        // Damaged stock tracked directly on warehouse stock rows
        supabase
          .from('warehouse_stock')
          .select('product_id, damaged_quantity, factory_return_quantity, compensation_quantity')
          .eq('branch_id', branchId),
      ]);

      return {
        receipts: receiptsRes.data || [],
        discrepancies: discrepanciesRes.data || [],
        workerStocks: workerStocksRes.data || [],
        warehouseDamaged: warehouseRes.data || [],
      };
    },
    enabled: !!branchId,
  });

  // Fetch sold from order_items for delivered orders
  const { data: soldData } = useQuery({
    queryKey: ['warehouse-sold-summary', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data: deliveredOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('branch_id', branchId)
        .eq('status', 'delivered');
      const orderIds = (deliveredOrders || []).map(o => o.id);
      if (orderIds.length === 0) return [];
      const { data } = await supabase
        .from('order_items')
        .select('product_id, quantity, gift_quantity')
        .in('order_id', orderIds);
      return data || [];
    },
    enabled: !!branchId,
  });

  const productSummaries = useMemo((): ProductSummary[] => {
    if (!products.length) return [];

    const summaries: Record<string, ProductSummary> = {};

    // Initialize all products
    for (const p of products) {
      summaries[p.id] = {
        productId: p.id,
        productName: p.name,
        received: 0,
        workerStock: 0,
        sold: 0,
        gifts: 0,
        damaged: 0,
        factoryReturn: 0,
        compensation: 0,
        surplus: 0,
        deficit: 0,
        remaining: 0,
      };
    }

    // Received
    for (const r of (summaryData?.receipts || [])) {
      if (summaries[r.product_id]) {
        summaries[r.product_id].received += Number(r.quantity || 0);
      }
    }

    // Worker stocks
    for (const ws of (summaryData?.workerStocks || [])) {
      if (summaries[ws.product_id]) {
        summaries[ws.product_id].workerStock += Number(ws.quantity || 0);
      }
    }

    // Sold from order_items (delivered orders)

    // Sold from order_items (delivered)
    for (const oi of (soldData || [])) {
      if (summaries[oi.product_id]) {
        const product = products.find(p => p.id === oi.product_id);
        const piecesPerBox = product?.pieces_per_box || 20;

        const rawQty = Number(oi.quantity || 0);
        const rawGiftPieces = Number(oi.gift_quantity || 0);

        // quantity is stored بصيغة صناديق.قطع (تعبيرية) => نحولها لإجمالي قطع أولاً
        const qtyRounded = Math.round(rawQty * 100) / 100;
        const qtyBoxes = Math.floor(qtyRounded);
        const qtyPieces = Math.round((qtyRounded - qtyBoxes) * 100);
        const totalQtyPieces = (qtyBoxes * piecesPerBox) + qtyPieces;

        // الهدايا لا تُحتسب كمباع: نطرحها من المباع، ونبقيها في خانة الهدايا فقط
        const paidPieces = Math.max(0, totalQtyPieces - rawGiftPieces);
        const paidBoxes = Math.floor(paidPieces / piecesPerBox);
        const paidRemPieces = paidPieces % piecesPerBox;
        const paidQtyInBoxPieceFormat = paidBoxes + (paidRemPieces / 100);

        summaries[oi.product_id].sold = Math.round((summaries[oi.product_id].sold + paidQtyInBoxPieceFormat) * 100) / 100;
        summaries[oi.product_id].gifts += rawGiftPieces;
      }
    }

    // Discrepancies (surplus / deficit فقط)
    for (const d of (summaryData?.discrepancies || [])) {
      if (!summaries[d.product_id]) continue;
      const qty = Number(d.quantity || 0);
      if (d.discrepancy_type === 'deficit') {
        summaries[d.product_id].deficit += qty;
      } else if (d.discrepancy_type === 'surplus') {
        summaries[d.product_id].surplus += qty;
      }
    }

    // Damaged, factory return, compensation from warehouse stock (current snapshot)
    for (const ws of (summaryData?.warehouseDamaged || [])) {
      if (!summaries[ws.product_id]) continue;
      summaries[ws.product_id].damaged += Number(ws.damaged_quantity || 0);
      summaries[ws.product_id].factoryReturn += Number(ws.factory_return_quantity || 0);
      summaries[ws.product_id].compensation += Number(ws.compensation_quantity || 0);
    }

    // Remaining = warehouse stock
    for (const ws of warehouseStock) {
      if (summaries[ws.product_id]) {
        summaries[ws.product_id].remaining = Number(ws.quantity || 0);
      }
    }

    // Hide products where all values are zero
    return Object.values(summaries)
      .filter(s => s.received + s.workerStock + s.sold + s.gifts + s.damaged + s.factoryReturn + s.compensation + s.surplus + s.deficit + s.remaining > 0)
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [products, summaryData, soldData, warehouseStock]);

  const filteredSummaries = useMemo(() => {
    if (!search.trim()) return productSummaries;
    return productSummaries.filter(s => s.productName.includes(search));
  }, [productSummaries, search]);

  // Fetch pallet quantity for review
  const { data: palletData } = useQuery({
    queryKey: ['branch-pallet-qty', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('branch_pallets')
        .select('quantity')
        .eq('branch_id', branchId!)
        .single();
      return data?.quantity || 0;
    },
    enabled: !!branchId,
  });

  if (isLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasStock = warehouseStock.length > 0;
  const stockItemsForSale = warehouseStock.map(s => ({
    id: s.id,
    product_id: s.product_id,
    quantity: s.quantity,
    product: s.product,
  }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {t('stock.warehouse_stock')}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate('/warehouse-review')}>
            <ClipboardCheck className="w-4 h-4 ml-1" />
            {t('warehouse.review')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/stock-receipts')}>
            <ClipboardList className="w-4 h-4 ml-1" />
            {t('warehouse.receipt_delivery')}
          </Button>
          {!isFactoryDeliveryHidden && (
            <Button size="sm" variant="outline" onClick={() => setShowReceiptDialog(true)}>
              <ClipboardList className="w-4 h-4 ml-1" />
              {t('warehouse.receipt')}
            </Button>
          )}
          {!isQuickLoadHidden && (
            <Button size="sm" variant="outline" onClick={() => setShowLoadWorkerDialog(true)}>
              <Truck className="w-4 h-4 ml-1" />
              {t('warehouse.load_worker')}
            </Button>
          )}
          {hasStock && !isDirectSaleHidden && (
            <Button size="sm" onClick={() => setShowSalesHubDialog(true)}>
              <ShoppingBag className="w-4 h-4 ml-1" />
              {t('stock.direct_sale')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="stock" className="text-xs gap-1">
            <Package className="w-3.5 h-3.5" />
            {t('warehouse.stock_tab')}
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            {t('warehouse.reviews_tab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4 mt-3">
      {/* Pallet Balance */}
      {branchId && <BranchPalletCard branchId={branchId} />}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('warehouse.search_product')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Product Summary Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <Package className="w-4 h-4" />
          {t('warehouse.stock_summary')}
          <Badge variant="secondary" className="text-xs">{filteredSummaries.length}</Badge>
        </h3>

        {filteredSummaries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {t('warehouse.no_stock_data')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 pb-2">
              {filteredSummaries.map(s => {
                const piecesPerBox = products.find(p => p.id === s.productId)?.pieces_per_box || 20;
                const fmt = (v: number) => boxesToBP(v, piecesPerBox);
                // Format gifts: gifts are stored as total pieces, convert to boxes first
                const giftInBoxes = s.gifts / piecesPerBox;
                const giftFormatted = boxesToBP(giftInBoxes, piecesPerBox);

                const row1 = [
                  { label: t('warehouse.at_workers'), value: s.workerStock, display: fmt(s.workerStock), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                  { label: t('warehouse.sold'), value: s.sold, display: fmt(s.sold), color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
                  { label: t('warehouse.surplus'), value: s.surplus, display: fmt(s.surplus), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                  { label: t('warehouse.deficit'), value: s.deficit, display: fmt(s.deficit), color: 'text-destructive', bg: 'bg-red-50 dark:bg-red-950/30' },
                ];
                const row2 = [
                  { label: t('warehouse.gifts'), value: s.gifts, display: giftFormatted, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
                  { label: t('warehouse.damaged'), value: s.damaged, display: fmt(s.damaged), color: 'text-destructive', bg: 'bg-red-50 dark:bg-red-950/30' },
                  { label: t('warehouse.returned'), value: s.factoryReturn, display: fmt(s.factoryReturn), color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
                  { label: t('warehouse.compensation'), value: s.compensation, display: fmt(s.compensation), color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
                ];
                return (
                  <Card key={s.productId} className="overflow-hidden border-border/60 shadow-sm">
                    {/* Product image + name + received + remaining */}
                    <button
                      className="w-full bg-primary/5 border-b border-border/40 px-3 py-2 flex items-center justify-between gap-2 hover:bg-primary/10 transition-colors"
                      onClick={() => setExpandedProduct(prev => prev === s.productId ? null : s.productId)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${expandedProduct === s.productId ? 'rotate-180' : ''}`} />
                        {(() => {
                          const prod = products.find(p => p.id === s.productId);
                          return prod?.image_url ? (
                            <img src={prod.image_url} alt={s.productName} className="w-8 h-8 rounded-md object-cover shrink-0 border border-border" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          );
                        })()}
                        <span className="font-semibold text-sm text-primary truncate">{s.productName}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                         <span className="text-[11px] text-muted-foreground">{t('warehouse.received')}</span>
                          <span className="text-sm font-bold tabular-nums text-emerald-600">{fmt(s.received)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{t('warehouse.remaining')}</span>
                          <span className={`text-base font-extrabold tabular-nums ${s.remaining > 0 ? 'text-primary' : 'text-muted-foreground/50'}`}>{fmt(s.remaining)}</span>
                        </div>
                      </div>
                    </button>
                    {expandedProduct === s.productId && (
                      <CardContent className="p-3 space-y-1.5">
                        <div className="grid grid-cols-4 gap-1.5">
                          {row1.map(st => (
                            <div key={st.label} className={`rounded-md px-2 py-1.5 text-center ${st.value > 0 ? st.bg : 'bg-muted/30'}`}>
                              <div className={`text-[11px] leading-tight mb-0.5 ${st.value > 0 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>{st.label}</div>
                              <div className={`text-sm font-bold tabular-nums ${st.value > 0 ? st.color : 'text-muted-foreground/40'}`}>{st.display}</div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {row2.map(st => (
                            <div key={st.label} className={`rounded-md px-2 py-1.5 text-center ${st.value > 0 ? st.bg : 'bg-muted/30'}`}>
                              <div className={`text-[11px] leading-tight mb-0.5 ${st.value > 0 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>{st.label}</div>
                              <div className={`text-sm font-bold tabular-nums ${st.value > 0 ? st.color : 'text-muted-foreground/40'}`}>{st.display}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
        )}
      </div>

      {/* Worker Stocks (collapsible) */}
      <div>
        <button
          className="flex items-center gap-2 w-full text-sm font-semibold text-muted-foreground py-2"
          onClick={() => setExpandedWorkers(prev => !prev)}
        >
          <Users className="w-4 h-4" />
          {t('stock.worker_stock')}
          <Badge variant="secondary" className="text-xs">{Object.keys(workerStocksByWorker).length}</Badge>
          <div className="flex-1" />
          {expandedWorkers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expandedWorkers && (
          Object.keys(workerStocksByWorker).length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                {t('stock.no_stock')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {Object.entries(workerStocksByWorker).map(([workerId, data]) => (
                <Card key={workerId}>
                  <CardContent className="p-3">
                    <div className="font-semibold text-sm mb-2 text-primary">
                      {data.worker?.full_name || t('common.unknown')}
                    </div>
                    <div className="space-y-1">
                      {data.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{item.product?.name}</span>
                          <span className="font-medium">{boxesToBP(Number(item.quantity || 0), item.product?.pieces_per_box || 20)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

        </TabsContent>

        <TabsContent value="review" className="mt-3">
          {branchId && <WarehouseReviewHistory branchId={branchId} />}
        </TabsContent>
      </Tabs>

      <SalesHubDialog
        open={showSalesHubDialog}
        onOpenChange={setShowSalesHubDialog}
        initialTab="direct"
        stockSource="warehouse"
        stockItems={stockItemsForSale}
      />

      <QuickReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        products={products}
        branchId={branchId}
        createReceipt={createReceipt}
      />

      <QuickLoadWorkerDialog
        open={showLoadWorkerDialog}
        onOpenChange={setShowLoadWorkerDialog}
        products={products}
        workers={workers}
        warehouseStock={warehouseStock}
        loadToWorker={loadToWorker}
      />

      {branchId && (
        <WarehouseReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          branchId={branchId}
          products={products}
          warehouseStock={warehouseStock}
          palletQuantity={palletData || 0}
        />
      )}
    </div>
  );
};

export default WarehouseStock;
