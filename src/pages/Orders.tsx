import React, { useState, useEffect, useRef, useMemo } from 'react';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { Product, Worker, OrderWithDetails } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkerPickerDialog from '@/components/stock/WorkerPickerDialog';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart, Loader2, Package, User, Calendar,
  CheckCircle, Clock, Truck, XCircle, UserCheck, Receipt, ReceiptText, Printer, Search, Gift, Eye, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedName } from '@/utils/sectorName';
import { useMyOrders, useOrders as useAllOrders, useAssignOrder, useDeleteOrder, useCancelOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import PermissionGate from '@/components/auth/PermissionGate';
import OrdersPrintView from '@/components/print/OrdersPrintView';
import PrintOrdersDialog from '@/components/orders/PrintOrdersDialog';
import OrderSearchDialog from '@/components/orders/OrderSearchDialog';
import CustomerActionDialog from '@/components/orders/CustomerActionDialog';
import SalesHubDialog from '@/components/sales/SalesHubDialog';
import OrderFlowDialog, { OrderDialogMode } from '@/components/orders/OrderFlowDialog';
import { useTrackVisit } from '@/hooks/useVisitTracking';
import { Customer } from '@/types/database';
import { useIsElementHidden } from '@/hooks/useUIOverrides';
import { useSectors } from '@/hooks/useSectors';
import ManualPromoEntryDialog from '@/components/offers/ManualPromoEntryDialog';
import { Edit } from 'lucide-react';
import { useSelectedWorker } from '@/contexts/SelectedWorkerContext';
import AdminWorkerBar from '@/components/workers/AdminWorkerBar';
import { isAdminRole } from '@/lib/utils';

const getDateLocale = (lang: string) => {
  switch (lang) {
    case 'fr': return fr;
    case 'en': return enUS;
    default: return ar;
  }
};

const OrdersContent: React.FC = () => {
  const location = useLocation();
  const { workerId, activeBranch, role } = useAuth();
  const { t, tp, language, loadPrintSettingsFromDB } = useLanguage();
  const isAdminOrBranchAdmin = isAdminRole(role);
  const { workerId: contextWorkerId, workerName: contextWorkerName, clearSelectedWorker } = useSelectedWorker();

  const STATUS_CONFIG = {
    pending: { label: t('orders.pending'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    assigned: { label: t('orders.assigned'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: UserCheck },
    in_progress: { label: t('orders.in_progress'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
    delivered: { label: t('orders.delivered'), color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: t('orders.cancelled'), color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  };

  const PAYMENT_TYPE_CONFIG = {
    with_invoice: { label: t('orders.with_invoice'), icon: Receipt, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    without_invoice: { label: t('orders.without_invoice'), icon: ReceiptText, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showSalesHubDialog, setShowSalesHubDialog] = useState(false);
  const [salesHubTab, setSalesHubTab] = useState<'direct' | 'delivery'>('direct');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogMode, setOrderDialogMode] = useState<OrderDialogMode>('create');
  const [orderDialogOrder, setOrderDialogOrder] = useState<OrderWithDetails | null>(null);
  const [orderDialogCustomerId, setOrderDialogCustomerId] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewOrders, setPreviewOrders] = useState<OrderWithDetails[]>([]);
  const [previewItems, setPreviewItems] = useState<Map<string, any[]>>(new Map());
  const [previewColumnConfig, setPreviewColumnConfig] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [customerIdFilter, setCustomerIdFilter] = useState<string | null>(null);
  const [pendingDeliveryOrder, setPendingDeliveryOrder] = useState<OrderWithDetails | null>(null);
  const [showManualPromoDialog, setShowManualPromoDialog] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>('');

  // Print state
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [allOrderItems, setAllOrderItems] = useState<Map<string, any[]>>(new Map());
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [filteredOrdersForPrint, setFilteredOrdersForPrint] = useState<OrderWithDetails[]>([]);
  const [printWorkerName, setPrintWorkerName] = useState<string | null>(null);
  const [printColumnConfig, setPrintColumnConfig] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: adminOrders, isLoading: adminLoading } = useAllOrders();
  const { data: myOrders, isLoading: myLoading } = useMyOrders();
  const rawOrders = isAdminOrBranchAdmin ? adminOrders : myOrders;
  const isLoading = isAdminOrBranchAdmin ? adminLoading : myLoading;

  // For cutoff: use contextWorkerId (admin viewing worker) or own workerId (worker viewing own orders)
  const cutoffWorkerId = contextWorkerId || (!isAdminOrBranchAdmin ? workerId : null);

  const { data: contextWorkerLastSession } = useQuery({
    queryKey: ['worker-last-accounting-session', cutoffWorkerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_sessions')
        .select('completed_at, period_end')
        .eq('worker_id', cutoffWorkerId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!cutoffWorkerId,
  });

  const contextWorkerCutoff = useMemo(() => {
    if (!contextWorkerLastSession) return null;
    const cutoffText = contextWorkerLastSession.completed_at || contextWorkerLastSession.period_end;
    if (!cutoffText) return null;
    const cutoff = new Date(cutoffText);
    return Number.isNaN(cutoff.getTime()) ? null : cutoff;
  }, [contextWorkerLastSession]);

  const orders = useMemo(() => {
    const list = rawOrders || [];

    const workerScopedOrders = contextWorkerId
      ? list.filter(order => order.assigned_worker_id === contextWorkerId || order.created_by === contextWorkerId)
      : list;

    if (!contextWorkerCutoff) return workerScopedOrders;

    return workerScopedOrders.filter(order => {
      if (order.status === 'delivered' || order.status === 'cancelled') {
        return new Date(order.created_at) > contextWorkerCutoff;
      }
      return true;
    });
  }, [rawOrders, contextWorkerId, contextWorkerCutoff]);

  const assignOrder = useAssignOrder();
  const deleteOrder = useDeleteOrder();
  const cancelOrder = useCancelOrder();
  const updateStatus = useUpdateOrderStatus();

  const stockSource = isAdminOrBranchAdmin ? 'warehouse' : 'worker';

  const { data: warehouseStockItems = [] } = useQuery({
    queryKey: ['orders-warehouse-stock', activeBranch?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_stock')
        .select('*, product:products(*)')
        .eq('branch_id', activeBranch!.id)
        .gt('quantity', 0);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdminOrBranchAdmin && !!activeBranch?.id,
  });

  const { data: workerStockItems = [] } = useQuery({
    queryKey: ['orders-worker-stock', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_stock')
        .select('*, product:products(*)')
        .eq('worker_id', workerId!)
        .gt('quantity', 0);
      if (error) throw error;
      return data || [];
    },
    enabled: !isAdminOrBranchAdmin && !!workerId,
  });

  const saleStockItems = (stockSource === 'warehouse' ? warehouseStockItems : workerStockItems) || [];

  const handleUpdateStatus = async (orderId: string, status: import('@/types/database').OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success('تم تحديث حالة الطلبية');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeliverClick = (order: OrderWithDetails) => {
    setPendingDeliveryOrder(order);
    setSalesHubTab('delivery');
    setShowSalesHubDialog(true);
  };

  const openCreateOrder = (customer?: Customer | null) => {
    setOrderDialogMode('create');
    setOrderDialogOrder(null);
    setOrderDialogCustomerId(customer?.id || null);
    setOrderDialogOpen(true);
  };

  const openOrderDetails = (order: OrderWithDetails) => {
    setOrderDialogMode('details');
    setOrderDialogOrder(order);
    setOrderDialogCustomerId(null);
    setOrderDialogOpen(true);
  };

  const openOrderEdit = (order: OrderWithDetails) => {
    setOrderDialogMode('edit');
    setOrderDialogOrder(order);
    setOrderDialogCustomerId(null);
    setOrderDialogOpen(true);
  };

  const { trackVisit } = useTrackVisit();
  const { sectors } = useSectors();
  const sectorMap = useMemo(() => {
    const map = new Map<string, string>();
    sectors.forEach(s => map.set(s.id, getLocalizedName(s, language)));
    return map;
  }, [sectors, language]);

  // UI override checks for actions
  const isCreateOrderHidden = useIsElementHidden('button', 'create_order');
  const isSearchHidden = useIsElementHidden('button', 'orders_search');
  const isPrintHidden = useIsElementHidden('button', 'orders_print');
  const isDeleteOrderHidden = useIsElementHidden('action', 'delete_order');
  const isCancelOrderHidden = useIsElementHidden('action', 'cancel_order');
  const isAssignOrderHidden = useIsElementHidden('action', 'assign_order');
  const isModifyOrderHidden = useIsElementHidden('action', 'modify_order');

  useEffect(() => {
    if (workerId) {
      fetchData();
      loadPrintSettingsFromDB(activeBranch?.id || null);
    }
  }, [activeBranch, workerId]);

  useEffect(() => {
    if (location.state?.customerId) {
      setSelectedCustomer({ id: location.state.customerId } as Customer);

      const action = location.state.action;
      if (action === 'sale') {
        setSalesHubTab('direct');
        setShowSalesHubDialog(true);
      } else if (action === 'delivery') {
        setCustomerIdFilter(location.state.customerId);
        setActiveTab('all'); // Show all orders for this customer regardless of status
      } else {
        openCreateOrder({ id: location.state.customerId } as Customer);
      }

      // Optional: Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      let workersQuery = supabase.from('workers').select('*').eq('is_active', true).order('full_name');

      if (activeBranch) {
        workersQuery = workersQuery.eq('branch_id', activeBranch.id);
      }

      const [productsRes, workersRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('name'),
        workersQuery,
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (workersRes.data) setWorkers(workersRes.data.filter(w => w.role === 'worker'));
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  const handleAssignOrder = async () => {
    if (!selectedOrderId || !selectedWorker) return;

    try {
      await assignOrder.mutateAsync({
        orderId: selectedOrderId,
        workerId: selectedWorker,
      });
      toast.success(t('orders.worker_assigned'));
      setShowAssignDialog(false);
      setSelectedWorker('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder.mutateAsync(orderId);
      toast.success(t('orders.deleted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder.mutateAsync(orderId);
      toast.success(t('orders.cancel_success'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Handle print with filter options
  // Merge orders for the same customer and aggregate product quantities
  const mergeOrdersByCustomer = (ordersToMerge: OrderWithDetails[], itemsMap: Map<string, any[]>, shouldGroupProducts: boolean): { mergedOrders: OrderWithDetails[], mergedItemsMap: Map<string, any[]> } => {
    const customerGroups = new Map<string, OrderWithDetails[]>();

    ordersToMerge.forEach(order => {
      const key = order.customer_id;
      const existing = customerGroups.get(key) || [];
      existing.push(order);
      customerGroups.set(key, existing);
    });

    const mergedOrders: OrderWithDetails[] = [];
    const mergedItemsMap = new Map<string, any[]>();

    customerGroups.forEach((customerOrders) => {
      if (customerOrders.length === 1) {
        mergedOrders.push(customerOrders[0]);
        mergedItemsMap.set(customerOrders[0].id, itemsMap.get(customerOrders[0].id) || []);
        return;
      }

      // Use the first order as base for merged order
      const baseOrder = { ...customerOrders[0] };
      // Sum total_amount from all orders for this customer
      const combinedTotal = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      if (combinedTotal > 0) baseOrder.total_amount = combinedTotal;
      const mergedId = baseOrder.id; // Keep first order's ID as the merged ID

      if (shouldGroupProducts) {
        // Aggregate product quantities across all orders for this customer
        const productQuantities = new Map<string, { quantity: number; item: any }>();
        customerOrders.forEach(order => {
          const items = itemsMap.get(order.id) || [];
          items.forEach((item: any) => {
            const existing = productQuantities.get(item.product_id);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              productQuantities.set(item.product_id, { quantity: item.quantity, item: { ...item } });
            }
          });
        });

        const mergedItems = Array.from(productQuantities.values()).map(({ quantity, item }) => ({
          ...item,
          order_id: mergedId,
          quantity,
        }));
        mergedItemsMap.set(mergedId, mergedItems);
      } else {
        // Just concatenate all items without aggregating
        const allItems: any[] = [];
        customerOrders.forEach(order => {
          const items = itemsMap.get(order.id) || [];
          allItems.push(...items.map((item: any) => ({ ...item, order_id: mergedId })));
        });
        mergedItemsMap.set(mergedId, allItems);
      }

      mergedOrders.push(baseOrder);
    });

    return { mergedOrders, mergedItemsMap };
  };

  const handlePrint = async (filterWorkerId: string | null, printPerWorker: boolean, filteredOrders: OrderWithDetails[], groupCustomers: boolean = true, groupProducts: boolean = true, columnConfig?: any[]) => {
    if (columnConfig) setPrintColumnConfig(columnConfig);
    if (!filteredOrders || filteredOrders.length === 0) {
      toast.error(t('print.no_orders'));
      return;
    }

    try {
      const orderIds = filteredOrders.map(o => o.id);
      const { data: items, error } = await supabase
        .from('order_items')
        .select('*, product:products(*)')
        .in('order_id', orderIds);

      if (error) throw error;

      let itemsMap = new Map<string, any[]>();
      items?.forEach(item => {
        const existing = itemsMap.get(item.order_id) || [];
        existing.push(item);
        itemsMap.set(item.order_id, existing);
      });

      // Apply grouping if enabled
      let ordersForPrint = filteredOrders;
      let itemsMapForPrint = itemsMap;

      if (groupCustomers) {
        const merged = mergeOrdersByCustomer(filteredOrders, itemsMap, groupProducts);
        ordersForPrint = merged.mergedOrders;
        itemsMapForPrint = merged.mergedItemsMap;
      }

      setAllOrderItems(itemsMapForPrint);

      if (printPerWorker) {
        const workersWithOrders = workers.filter(worker =>
          ordersForPrint.some(order => order.assigned_worker_id === worker.id)
        );

        for (const worker of workersWithOrders) {
          let workerOrders = ordersForPrint.filter(o => o.assigned_worker_id === worker.id);

          setFilteredOrdersForPrint(workerOrders);
          setPrintWorkerName(worker.full_name);
          setIsPrintReady(true);

          await new Promise(resolve => setTimeout(resolve, 500));
          window.print();
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setIsPrintReady(false);
        setPrintWorkerName(null);
      } else {
        let workerName: string | null = null;

        if (filterWorkerId === 'unassigned') {
          workerName = tp('print.orders_without_worker');
        } else if (filterWorkerId) {
          workerName = workers.find(w => w.id === filterWorkerId)?.full_name || null;
        }

        setFilteredOrdersForPrint(ordersForPrint);
        setPrintWorkerName(workerName);
        setIsPrintReady(true);

        setTimeout(() => {
          window.print();
          setIsPrintReady(false);
          setPrintWorkerName(null);
        }, 500);
      }
    } catch (error: any) {
      toast.error(t('print.print_error'));
      console.error(error);
    }
  };

  // Handle CSV export
  const handleExportCSV = async (filteredOrders: OrderWithDetails[]) => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast.error(t('print.no_orders_export'));
      return;
    }

    try {
      const orderIds = filteredOrders.map(o => o.id);
      const { data: items, error } = await supabase
        .from('order_items')
        .select('*, product:products(*)')
        .in('order_id', orderIds);

      if (error) throw error;

      const itemsMap = new Map<string, any[]>();
      items?.forEach(item => {
        const existing = itemsMap.get(item.order_id) || [];
        existing.push(item);
        itemsMap.set(item.order_id, existing);
      });

      const productNames = products.map(p => p.name);
      const headers = [t('orders.order_number'), t('orders.customer'), t('common.phone'), t('common.address'), t('orders.delivery_worker'), t('orders.delivery_date'), t('common.status'), ...productNames];

      const rows = filteredOrders.map(order => {
        const orderItemsData = itemsMap.get(order.id) || [];
        const productQuantities = products.map(product => {
          const item = orderItemsData.find((i: any) => i.product_id === product.id);
          return item?.quantity || 0;
        });

        return [
          order.id.substring(0, 8).toUpperCase(),
          order.customer?.name || '',
          order.customer?.phone || '',
          order.customer?.address || '',
          order.assigned_worker?.full_name || '',
          order.delivery_date || '',
          order.status,
          ...productQuantities
        ];
      });

      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `orders_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(t('print.export_success'));
    } catch (error: any) {
      toast.error(t('print.export_error'));
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4 touch-pan-y">
      {/* Print View */}
      <OrdersPrintView
        ref={printRef}
        orders={filteredOrdersForPrint.length > 0 ? filteredOrdersForPrint : orders}
        orderItems={allOrderItems}
        products={products}
        title={printWorkerName ? `${tp('print.orders_for')} - ${printWorkerName}` : tp('print.order_list')}
        isVisible={isPrintReady}
        columnConfig={printColumnConfig}
      />

      {/* Print Dialog */}
      <PrintOrdersDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        workers={workers}
        orders={orders.filter(o => o.status !== 'cancelled')}
        products={products}
        onPrint={handlePrint}
        onExportCSV={handleExportCSV}
        onPreview={async (filteredOrders, columnConfig) => {
          // Fetch items for preview
          const orderIds = filteredOrders.map(o => o.id);
          const { data: items } = await supabase
            .from('order_items')
            .select('*, product:products(*)')
            .in('order_id', orderIds);
          const itemsMap = new Map<string, any[]>();
          items?.forEach(item => {
            const existing = itemsMap.get(item.order_id) || [];
            existing.push(item);
            itemsMap.set(item.order_id, existing);
          });
          setPreviewOrders(filteredOrders);
          setPreviewItems(itemsMap);
          setPreviewColumnConfig(columnConfig);
          setShowPrintDialog(false);
          setShowPreviewDialog(true);
        }}
      />

      {/* Print Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {t('orders.preview')}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(90vh-8rem)] p-2">
            <div className="transform scale-[0.6] origin-top-left" style={{ width: '166%' }}>
              <OrdersPrintView
                orders={previewOrders}
                orderItems={previewItems}
                products={products}
                title={tp('print.order_list')}
                isVisible={true}
                columnConfig={previewColumnConfig}
              />
            </div>
          </div>
          <div className="p-3 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => {
              setShowPreviewDialog(false);
              setAllOrderItems(previewItems);
              setFilteredOrdersForPrint(previewOrders);
              setPrintColumnConfig(previewColumnConfig);
              setIsPrintReady(true);
              setTimeout(() => {
                window.print();
                setIsPrintReady(false);
              }, 500);
            }}>
              <Printer className="w-4 h-4 ms-2" />
              {t('common.print')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OrderFlowDialog
        open={orderDialogOpen}
        onOpenChange={(open) => {
          setOrderDialogOpen(open);
          if (!open) {
            setOrderDialogOrder(null);
            setOrderDialogCustomerId(null);
          }
        }}
        mode={orderDialogMode}
        order={orderDialogOrder}
        initialCustomerId={orderDialogCustomerId ?? undefined}
      />

      <SalesHubDialog
        open={showSalesHubDialog}
        onOpenChange={(open) => {
          setShowSalesHubDialog(open);
          if (!open) setPendingDeliveryOrder(null);
        }}
        initialCustomerId={selectedCustomer?.id}
        initialTab={salesHubTab}
        initialDeliveryOrder={pendingDeliveryOrder}
        stockSource={stockSource}
        stockItems={saleStockItems.map((s: any) => ({
          id: s.id,
          product_id: s.product_id,
          quantity: s.quantity,
          product: s.product,
        }))}
      />

      <CustomerActionDialog
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
        directAction="order"
        onOrder={(customer) => {
          openCreateOrder(customer);
        }}
        onSale={(customer) => {
          setSelectedCustomer(customer);
          setSalesHubTab('direct');
          setShowSalesHubDialog(true);
        }}
        onVisitOnly={async (customer) => {
          try {
            await trackVisit({ customerId: customer.id, operationType: 'visit' });
            toast.success(t('debts.visit_recorded'));
          } catch (error) {
            console.error('Error recording visit:', error);
            toast.error(t('common.error'));
          }
        }}
        allowedActions={['order', 'sale', 'visit']}
      />

      {/* Order Search Dialog */}
      <OrderSearchDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
      />

      {/* Admin Worker Bar */}
      {isAdminOrBranchAdmin && <AdminWorkerBar />}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">
              {t('orders.title')}{contextWorkerId && contextWorkerName && <span className="text-primary"> - {contextWorkerName}</span>}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isSearchHidden && (
              <Button variant="outline" size="sm" onClick={() => setShowSearchDialog(true)}>
                <Search className="w-4 h-4" />
              </Button>
            )}
            {!isPrintHidden && (
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowPrintDialog(true)} disabled={orders.length === 0}>
                <Printer className="w-4 h-4" />
              </Button>
            )}
            {!isCreateOrderHidden && (
              <Button size="icon" className="h-8 w-8 relative" onClick={() => setShowActionDialog(true)}>
                <ShoppingCart className="w-4 h-4" />
                <Plus className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full" />
              </Button>
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowManualPromoDialog(true)} title={t('promos.manual_entry') || 'تسجيل عرض يدوي'}>
              <Gift className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {customerIdFilter && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm animate-in fade-in slide-in-from-top-1">
            <User className="w-4 h-4" />
            <span className="font-medium">
              {t('common.filter_by')}: {orders.find(o => o.customer_id === customerIdFilter)?.customer?.name || t('common.customer')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto hover:bg-primary/20"
              onClick={() => setCustomerIdFilter(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-10">
          <TabsTrigger value="all" className="text-[10px] sm:text-xs px-0.5 sm:px-1 gap-0.5 flex flex-col sm:flex-row items-center">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>{orders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-[10px] sm:text-xs px-0.5 sm:px-1 gap-0.5 flex flex-col sm:flex-row items-center">
            <Clock className="w-3.5 h-3.5 shrink-0 text-yellow-600" />
            <span>{orders.filter(o => o.status === 'pending' || o.status === 'assigned').length}</span>
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-[10px] sm:text-xs px-0.5 sm:px-1 gap-0.5 flex flex-col sm:flex-row items-center">
            <Truck className="w-3.5 h-3.5 shrink-0 text-purple-600" />
            <span>{orders.filter(o => o.status === 'in_progress').length}</span>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="text-[10px] sm:text-xs px-0.5 sm:px-1 gap-0.5 flex flex-col sm:flex-row items-center">
            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-600" />
            <span>{orders.filter(o => o.status === 'delivered').length}</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-[10px] sm:text-xs px-0.5 sm:px-1 gap-0.5 flex flex-col sm:flex-row items-center">
            <XCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span>{orders.filter(o => o.status === 'cancelled').length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List - Filtered by Tab */}
      <div className="space-y-3">
        {orders.filter(order => {
          // If customer filter is active, only show that customer's orders
          if (customerIdFilter && order.customer_id !== customerIdFilter) return false;

          if (activeTab === 'all') return true;
          if (activeTab === 'pending') return order.status === 'pending' || order.status === 'assigned';
          return order.status === activeTab;
        }).map((order) => {
          const StatusIcon = STATUS_CONFIG[order.status]?.icon || Clock;
          return (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <button
                        className="font-bold hover:text-primary hover:underline transition-colors text-right"
                        onClick={() => {
                          openCreateOrder(order.customer as Customer);
                        }}
                      >
                        <CustomerSummary
                          customer={{
                            name: order.customer?.name,
                            store_name: order.customer?.store_name,
                            customer_type: order.customer?.customer_type,
                            sector_name: order.customer?.sector_id ? sectorMap.get(order.customer.sector_id) : undefined,
                          }}
                          compact
                          showAvatar={false}
                          showMeta={false}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={STATUS_CONFIG[order.status]?.color}>
                        <StatusIcon className="w-3 h-3 ml-1" />
                        {STATUS_CONFIG[order.status]?.label}
                      </Badge>

                      {order.payment_type && (
                        <Badge className={PAYMENT_TYPE_CONFIG[order.payment_type]?.color || 'bg-muted'}>
                          {order.payment_type === 'with_invoice' ? (
                            <Receipt className="w-3 h-3 ml-1" />
                          ) : (
                            <ReceiptText className="w-3 h-3 ml-1" />
                          )}
                          {PAYMENT_TYPE_CONFIG[order.payment_type]?.label}
                        </Badge>
                      )}

                      {order.total_amount && Number(order.total_amount) > 0 && (
                        <Badge variant="outline" className="font-bold text-primary">
                          {Number(order.total_amount).toLocaleString()} دج
                        </Badge>
                      )}
                    </div>

                    {order.delivery_date && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(order.delivery_date), 'dd MMMM yyyy', { locale: getDateLocale(language) })}
                      </div>
                    )}

                    {order.assigned_worker && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span>{t('orders.worker')}: {order.assigned_worker.full_name}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: getDateLocale(language) })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openOrderDetails(order);
                      }}
                    >
                      <Package className="w-4 h-4" />
                    </Button>

                    {!isModifyOrderHidden && order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          openOrderEdit(order);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}

                    {order.status === 'assigned' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                        title="جاري التوصيل"
                        onClick={() => handleUpdateStatus(order.id, 'in_progress')}
                        disabled={updateStatus.isPending}
                      >
                        <Truck className="w-4 h-4" />
                      </Button>
                    )}

                    {order.status === 'in_progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary/30 hover:bg-primary/10"
                        title="تم التوصيل"
                        onClick={() => handleDeliverClick(order)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}

                    {order.status === 'pending' && (
                      <>
                        {!isAssignOrderHidden && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setShowAssignDialog(true);
                            }}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {!isDeleteOrderHidden && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteOrder(order.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}

                    {/* Reassign button for assigned/in_progress orders */}
                    {(order.status === 'assigned' || order.status === 'in_progress') && !isAssignOrderHidden && (
                      <Button
                        variant="outline"
                        size="sm"
                        title="إعادة تعيين عامل التوصيل"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setShowAssignDialog(true);
                        }}
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                    )}

                    {!isCancelOrderHidden && (order.status === 'assigned' || order.status === 'in_progress' || order.status === 'delivered') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setConfirmCancelOrderId(order.id)}
                        disabled={cancelOrder.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Admin/BranchAdmin: force delete any order */}
                    {isAdminOrBranchAdmin && order.status !== 'pending' && order.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                        title="حذف الطلبية (أدمن)"
                        onClick={() => setConfirmDeleteOrderId(order.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('orders.no_orders')}</p>
          </div>
        )}
      </div>

      {/* Assign Worker Picker Dialog */}
      <WorkerPickerDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        workers={workers.map(w => ({ id: w.id, full_name: w.full_name, username: w.username }))}
        selectedWorkerId={selectedWorker}
        onSelect={(workerId) => {
          setSelectedWorker(workerId);
          if (selectedOrderId) {
            assignOrder.mutateAsync({ orderId: selectedOrderId, workerId })
              .then(() => {
                toast.success(t('orders.worker_assigned'));
                setShowAssignDialog(false);
                setSelectedWorker('');
              })
              .catch((error: any) => {
                toast.error(error.message || t('common.error'));
              });
          }
        }}
      />

      {/* Confirm Cancel Order */}
      <AlertDialog open={!!confirmCancelOrderId} onOpenChange={() => setConfirmCancelOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء الطلبية</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من إلغاء هذه الطلبية؟ لا يمكن التراجع عن هذه العملية.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (confirmCancelOrderId) handleCancelOrder(confirmCancelOrderId); setConfirmCancelOrderId(null); }}>تأكيد الإلغاء</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Force Delete Order */}
      <AlertDialog open={!!confirmDeleteOrderId} onOpenChange={() => setConfirmDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-destructive" />حذف الطلبية نهائياً</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه الطلبية نهائياً؟ سيتم حذف جميع بياناتها ولا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { if (confirmDeleteOrderId) { try { await supabase.from('order_items').delete().eq('order_id', confirmDeleteOrderId); await supabase.from('orders').delete().eq('id', confirmDeleteOrderId); toast.success(t('orders.deleted')); } catch (e: any) { toast.error(e.message); } } setConfirmDeleteOrderId(null); }}>حذف نهائياً</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManualPromoEntryDialog
        open={showManualPromoDialog}
        onOpenChange={setShowManualPromoDialog}
      />
    </div>
  );
};

const Orders: React.FC = () => {
  return (
    <PermissionGate
      requiredPermissions={['page_orders', 'view_orders', 'create_orders']}
      redirectTo="/"
    >
      <OrdersContent />
    </PermissionGate>
  );
};

export default Orders;
