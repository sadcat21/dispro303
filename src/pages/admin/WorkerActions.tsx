import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useSelectedWorker } from '@/contexts/SelectedWorkerContext';
import { ArrowRight, Calculator, Truck, Banknote, Wallet, MapPin, ShoppingCart, Activity, Shield, HardHat, HandCoins, ArrowLeftRight, ClipboardList, Trophy, AlertTriangle, DollarSign, Package, PackageOpen, ClipboardCheck, TrendingUp, TrendingDown, Gift, CalendarDays, ShoppingBag, Settings, History, RefreshCw } from 'lucide-react';
import { useWorkerLiability } from '@/hooks/useWorkerLiability';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useMyUIOverrides } from '@/hooks/useUIOverrides';
import { Badge } from '@/components/ui/badge';
import { Worker } from '@/types/database';
import { getLocalizedName } from '@/utils/sectorName';

const JS_DAY_TO_NAME: Record<number, string> = {
  6: 'saturday', 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday',
};

const WORKER_CARD_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', accent: 'text-blue-600' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', accent: 'text-emerald-600' },
  { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', accent: 'text-amber-600' },
  { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', accent: 'text-violet-600' },
  { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', accent: 'text-rose-600' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-100 text-cyan-600', accent: 'text-cyan-600' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', accent: 'text-orange-600' },
  { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600', accent: 'text-teal-600' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', accent: 'text-indigo-600' },
  { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'bg-pink-100 text-pink-600', accent: 'text-pink-600' },
];

const formatTruckQty = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safeValue * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(Math.trunc(rounded));
  }
  const [whole, fraction = ''] = rounded.toFixed(2).split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
};

const toGiftTruckQty = (value: number) => Math.max(0, Number(value || 0) / 100);

import CoinExchangeDialog from '@/components/treasury/CoinExchangeDialog';
import WorkerHandoverPreviewDialog from '@/components/accounting/WorkerHandoverPreviewDialog';
import TodayCustomersDialog from '@/components/sectors/TodayCustomersDialog';
import WorkerFinancialDialog from '@/components/rewards/WorkerFinancialDialog';
import WorkerPointsDialog from '@/components/rewards/WorkerPointsDialog';
import StockVerificationDialog from '@/components/stock/StockVerificationDialog';
import WorkerAttendanceLogDialog from '@/components/attendance/WorkerAttendanceLogDialog';
import WorkerSalesSummaryDialog from '@/components/accounting/WorkerSalesSummaryDialog';
import WorkerOrdersSummaryDialog from '@/components/accounting/WorkerOrdersSummaryDialog';
import WorkerGiftsSummaryDialog from '@/components/accounting/WorkerGiftsSummaryDialog';
import EditWorkerProfileDialog from '@/components/workers/EditWorkerProfileDialog';
import SectorScheduleDialog from '@/components/sectors/SectorScheduleDialog';
import SectorCoverageDialog from '@/components/sectors/SectorCoverageDialog';
import ExchangeSessionDialog from '@/components/stock/ExchangeSessionDialog';
import { isAdminRole } from '@/lib/utils';

const workerActions = [
  { key: 'worker_profile', icon: Settings, path: '', labelKey: 'worker_actions.worker_profile', color: 'bg-gray-50 border-gray-200 text-gray-700', isDialog: true },
  { key: 'accounting', icon: Calculator, path: '/accounting', labelKey: 'accounting.title', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'load_stock', icon: Truck, path: '/load-stock', labelKey: 'stock.load_to_worker', color: 'bg-green-50 border-green-200 text-green-700' },
  { key: 'truck_stock', icon: Package, path: '', labelKey: 'worker_actions.truck_stock', color: 'bg-lime-50 border-lime-200 text-lime-700', isDialog: true },
  { key: 'unload_truck', icon: PackageOpen, path: '/load-stock', labelKey: 'worker_actions.unload_truck', color: 'bg-red-50 border-red-200 text-red-700' },
  { key: 'stock_review', icon: ClipboardCheck, path: '', labelKey: 'worker_actions.stock_review', color: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700', isDialog: true },
  { key: 'session_history', icon: History, path: '/load-stock', labelKey: 'worker_actions.session_history', color: 'bg-stone-50 border-stone-200 text-stone-700' },
  { key: 'worker_debts', icon: Banknote, path: '/worker-debts', labelKey: 'nav.worker_debts', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { key: 'liability', icon: HandCoins, path: '/worker-liability', labelKey: 'liability.title', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { key: 'coin_exchange', icon: ArrowLeftRight, path: '', labelKey: 'coin_exchange.title', color: 'bg-cyan-50 border-cyan-200 text-cyan-700', isDialog: true },
  { key: 'expenses', icon: Wallet, path: '/expenses-management', labelKey: 'expenses.title', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { key: 'tracking', icon: MapPin, path: '/worker-tracking', labelKey: 'navigation.worker_tracking', color: 'bg-teal-50 border-teal-200 text-teal-700' },
  { key: 'orders', icon: ShoppingCart, path: '/orders', labelKey: 'nav.orders', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'activity', icon: Activity, path: '/activity-logs', labelKey: 'nav.activity_logs', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { key: 'permissions', icon: Shield, path: '/permissions', labelKey: 'nav.permissions', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  { key: 'financial', icon: DollarSign, path: '', labelKey: 'worker_actions.financial', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', isDialog: true },
  { key: 'points_log', icon: Trophy, path: '', labelKey: 'worker_actions.points_log', color: 'bg-purple-50 border-purple-200 text-purple-700', isDialog: true },
  { key: 'rewards_page', icon: AlertTriangle, path: '/rewards', labelKey: 'worker_actions.rewards_page', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { key: 'handover_summary', icon: ClipboardList, path: '', labelKey: 'worker_actions.handover_summary', color: 'bg-indigo-50 border-indigo-200 text-indigo-700', isDialog: true },
  { key: 'today_customers', icon: MapPin, path: '', labelKey: 'worker_actions.today_customers', color: 'bg-sky-50 border-sky-200 text-sky-700', isDialog: true },
  { key: 'attendance_log', icon: CalendarDays, path: '', labelKey: 'worker_actions.attendance_log', color: 'bg-teal-50 border-teal-200 text-teal-700', isDialog: true },
  { key: 'sales_summary', icon: ShoppingBag, path: '', labelKey: 'worker_actions.sales_summary', color: 'bg-amber-50 border-amber-200 text-amber-700', isDialog: true },
  { key: 'gifts_summary', icon: Gift, path: '', labelKey: 'worker_actions.gifts_summary', color: 'bg-purple-50 border-purple-200 text-purple-700', isDialog: true },
  { key: 'achievements', icon: Trophy, path: '', labelKey: 'worker_actions.achievements', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', isDialog: true },
  { key: 'sector_schedule', icon: MapPin, path: '', labelKey: 'worker_actions.sector_schedule', color: 'bg-sky-50 border-sky-200 text-sky-700', isDialog: true },
  { key: 'sector_coverage', icon: RefreshCw, path: '', labelKey: 'worker_actions.sector_coverage', color: 'bg-orange-50 border-orange-200 text-orange-700', isDialog: true },
  { key: 'orders_summary', icon: ClipboardList, path: '', labelKey: 'worker_actions.orders_summary', color: 'bg-blue-50 border-blue-200 text-blue-700', isDialog: true },
  { key: 'exchange_damaged', icon: RefreshCw, path: '', labelKey: 'worker_actions.exchange_damaged', color: 'bg-orange-50 border-orange-200 text-orange-700', isDialog: true },
];

const WorkerActions: React.FC = () => {
  const { activeBranch, role, workerId, activeRole } = useAuth();
  const { t, language } = useLanguage();
  const { data: myOverrides } = useMyUIOverrides();
  const navigate = useNavigate();
  const { setSelectedWorker: setContextWorker } = useSelectedWorker();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const { data: liability } = useWorkerLiability(selectedWorker?.id);
  const [coinExchangeOpen, setCoinExchangeOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [todayCustomersOpen, setTodayCustomersOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [pointsLogOpen, setPointsLogOpen] = useState(false);
  const [truckStockOpen, setTruckStockOpen] = useState(false);
  const [truckProductHistoryOpen, setTruckProductHistoryOpen] = useState(false);
  const [selectedTruckProduct, setSelectedTruckProduct] = useState<any | null>(null);
  const [stockReviewOpen, setStockReviewOpen] = useState(false);
  const [attendanceLogOpen, setAttendanceLogOpen] = useState(false);
  const [salesSummaryOpen, setSalesSummaryOpen] = useState(false);
  const [giftsSummaryOpen, setGiftsSummaryOpen] = useState(false);
  const [workerProfileOpen, setWorkerProfileOpen] = useState(false);
  const [sectorScheduleOpen, setSectorScheduleOpen] = useState(false);
  const [sectorScheduleType, setSectorScheduleType] = useState<'delivery' | 'sales'>('delivery');
  const [ordersSummaryOpen, setOrdersSummaryOpen] = useState(false);
  const [sectorCoverageOpen, setSectorCoverageOpen] = useState(false);
  const [exchangeDamagedOpen, setExchangeDamagedOpen] = useState(false);

  const isWarehouseManager = activeRole?.custom_role_code === 'warehouse_manager';
  // Warehouse manager sees admin-style worker list (like supervisor)
  const isSelfMode = role === 'worker' && !isWarehouseManager;
  const isSupervisorMode = role === 'supervisor';
  const isWarehouseMode = isWarehouseManager && role === 'worker';

  // For supervisors: fetch assigned workers
  const { data: supervisorAssignments = [] } = useQuery({
    queryKey: ['supervisor-workers', workerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('supervisor_workers')
        .select('worker_id')
        .eq('supervisor_id', workerId!);
      return (data || []).map(d => d.worker_id);
    },
    enabled: isSupervisorMode && !!workerId,
  });

  // For warehouse managers: fetch assigned workers
  const { data: managerAssignments = [] } = useQuery({
    queryKey: ['manager-workers', workerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('manager_workers')
        .select('worker_id')
        .eq('manager_id', workerId!);
      return (data || []).map((d: any) => d.worker_id);
    },
    enabled: isWarehouseMode && !!workerId,
  });

  useRealtimeSubscription(
    `worker-actions-realtime-${selectedWorker?.id || 'none'}`,
    [
      { table: 'workers' },
      { table: 'worker_stock', filter: selectedWorker?.id ? `worker_id=eq.${selectedWorker.id}` : undefined },
      { table: 'loading_sessions', filter: selectedWorker?.id ? `worker_id=eq.${selectedWorker.id}` : undefined },
      { table: 'loading_session_items' },
      { table: 'orders' },
      { table: 'order_items' },
      { table: 'accounting_sessions', filter: selectedWorker?.id ? `worker_id=eq.${selectedWorker.id}` : undefined },
      { table: 'worker_locations' },
      { table: 'customer_debts' },
      { table: 'debt_collections' },
      { table: 'worker_debts' },
      { table: 'worker_debt_payments' },
    ],
    [
      ['workers-for-actions', activeBranch?.id],
      ['worker-truck-stock', selectedWorker?.id],
      ['worker-last-accounting', selectedWorker?.id],
      ['worker-truck-loaded', selectedWorker?.id],
      ['worker-truck-sold', selectedWorker?.id],
      ['worker-liability', selectedWorker?.id, activeBranch?.id],
      ['worker-sales-summary', selectedWorker?.id],
      ['worker-locations', activeBranch?.id],
      ['worker-debts', selectedWorker?.id, activeBranch?.id],
      ['visit-tracking', activeBranch?.id],
    ],
    !!selectedWorker?.id
  );

  const { data: workers = [] } = useQuery({
    queryKey: ['workers-for-actions', activeBranch?.id, isSupervisorMode, isWarehouseMode, supervisorAssignments, managerAssignments],
    queryFn: async () => {
      let query = supabase.from('workers').select('*').eq('is_active', true).order('full_name');
      if (activeBranch?.id && !isSupervisorMode) query = query.eq('branch_id', activeBranch.id);
      const { data } = await query;
      let result = (data || []) as Worker[];
      // Supervisor: filter to only assigned workers
      if (isSupervisorMode && supervisorAssignments.length > 0) {
        result = result.filter(w => supervisorAssignments.includes(w.id));
      } else if (isSupervisorMode && supervisorAssignments.length === 0) {
        result = [];
      }
      // Warehouse manager: filter to only assigned workers
      if (isWarehouseMode && managerAssignments.length > 0) {
        result = result.filter(w => managerAssignments.includes(w.id));
      } else if (isWarehouseMode && managerAssignments.length === 0) {
        result = [];
      }
      return result;
    },
    enabled: !isSelfMode,
  });

  // Self-mode: auto-select self as the worker
  const { data: selfWorker } = useQuery({
    queryKey: ['self-worker', workerId],
    queryFn: async () => {
      const { data } = await supabase.from('workers').select('*').eq('id', workerId!).single();
      return data as Worker | null;
    },
    enabled: isSelfMode && !!workerId,
  });

  // Auto-select self worker
  React.useEffect(() => {
    if (isSelfMode && selfWorker && !selectedWorker) {
      setSelectedWorker(selfWorker);
      setContextWorker(selfWorker.id, selfWorker.full_name);
    }
  }, [isSelfMode, selfWorker]);


  const todayName = JS_DAY_TO_NAME[new Date().getDay()] || '';

  // Fetch sectors for today's assignments
  const { data: sectors = [] } = useQuery({
    queryKey: ['worker-actions-sectors', activeBranch?.id],
    queryFn: async () => {
      let query = supabase.from('sectors').select('id, name, name_fr, sales_worker_id, delivery_worker_id, visit_day_sales, visit_day_delivery');
      if (activeBranch?.id) query = query.eq('branch_id', activeBranch.id);
      const { data } = await query;
      return data || [];
    },
  });

  // Fetch sector_schedules for multi-schedule support
  const { data: sectorSchedules = [] } = useQuery({
    queryKey: ['worker-actions-sector-schedules', activeBranch?.id],
    queryFn: async () => {
      const { data } = await supabase.from('sector_schedules').select('*');
      return data || [];
    },
  });

  // Fetch worker roles
  const { data: workerRolesData = [] } = useQuery({
    queryKey: ['worker-actions-roles', activeBranch?.id],
    queryFn: async () => {
      let query = supabase.from('worker_roles').select('worker_id, custom_roles(name_ar, code)');
      if (activeBranch?.id) query = query.eq('branch_id', activeBranch.id);
      const { data } = await query;
      return data || [];
    },
  });

  // Build worker role labels map
  const workerRoleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const wr of workerRolesData) {
      const roleName = (wr as any).custom_roles?.name_ar;
      if (roleName && wr.worker_id) {
        map[wr.worker_id] = map[wr.worker_id] ? `${map[wr.worker_id]}، ${roleName}` : roleName;
      }
    }
    return map;
  }, [workerRolesData]);

  // Build sector name lookup
  const sectorNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sectors) {
      map[s.id] = getLocalizedName(s, language);
    }
    return map;
  }, [sectors, language]);

  // Build today's sector assignments per worker using sector_schedules
  const workerTodaySectors = useMemo(() => {
    const map: Record<string, { delivery: string[]; sales: string[] }> = {};
    
    // Use sector_schedules table (new system)
    for (const sc of sectorSchedules) {
      if (sc.day !== todayName || !sc.worker_id) continue;
      const sectorName = sectorNameMap[sc.sector_id] || '';
      if (!sectorName) continue;
      if (!map[sc.worker_id]) map[sc.worker_id] = { delivery: [], sales: [] };
      if (sc.schedule_type === 'delivery') {
        map[sc.worker_id].delivery.push(sectorName);
      } else if (sc.schedule_type === 'sales') {
        map[sc.worker_id].sales.push(sectorName);
      }
    }

    // Fallback: also check legacy fields for sectors without schedules
    for (const s of sectors) {
      const hasNewSchedule = sectorSchedules.some(sc => sc.sector_id === s.id);
      if (hasNewSchedule) continue;
      const sectorName = sectorNameMap[s.id] || '';
      if (s.visit_day_delivery === todayName && s.delivery_worker_id) {
        if (!map[s.delivery_worker_id]) map[s.delivery_worker_id] = { delivery: [], sales: [] };
        map[s.delivery_worker_id].delivery.push(sectorName);
      }
      if (s.visit_day_sales === todayName && s.sales_worker_id) {
        if (!map[s.sales_worker_id]) map[s.sales_worker_id] = { delivery: [], sales: [] };
        map[s.sales_worker_id].sales.push(sectorName);
      }
    }
    return map;
  }, [sectorSchedules, sectors, todayName, sectorNameMap]);

  const { data: truckStock = [] } = useQuery({
    queryKey: ['worker-truck-stock', selectedWorker?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('worker_stock')
        .select('*, product:products(name, image_url, pieces_per_box)')
        .eq('worker_id', selectedWorker!.id)
        .gte('quantity', 0);
      return data || [];
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  // Fetch last accounting session for selected worker
  const { data: lastWorkerAccounting } = useQuery({
    queryKey: ['worker-last-accounting', selectedWorker?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('accounting_sessions')
        .select('completed_at')
        .eq('worker_id', selectedWorker!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      return data?.completed_at || null;
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  // Fetch loaded quantities since last accounting
  const { data: truckLoadedData } = useQuery({
    queryKey: ['worker-truck-loaded', selectedWorker?.id, lastWorkerAccounting],
    queryFn: async () => {
      let sessionsQuery = supabase
        .from('loading_sessions')
        .select('id, created_at, status, notes, manager:workers!loading_sessions_manager_id_fkey(full_name)')
        .eq('worker_id', selectedWorker!.id)
        .in('status', ['completed', 'open']);
      if (lastWorkerAccounting) {
        sessionsQuery = sessionsQuery.gte('created_at', lastWorkerAccounting);
      }
      const { data: sessions } = await sessionsQuery;
      if (!sessions || sessions.length === 0) return [];
      const sessionIds = sessions.map(s => s.id);
      const { data: items } = await supabase
        .from('loading_session_items')
        .select('session_id, product_id, quantity, gift_quantity, previous_quantity')
        .in('session_id', sessionIds);
      return items || [];
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  const { data: truckLoadSessions = [] } = useQuery({
    queryKey: ['worker-truck-load-sessions', selectedWorker?.id, lastWorkerAccounting],
    queryFn: async () => {
      let query = supabase
        .from('loading_sessions')
        .select('id, created_at, status, notes, manager:workers!loading_sessions_manager_id_fkey(full_name)')
        .eq('worker_id', selectedWorker!.id)
        .in('status', ['completed', 'open']);
      if (lastWorkerAccounting) {
        query = query.gte('created_at', lastWorkerAccounting);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  const { data: truckUnloadedData } = useQuery({
    queryKey: ['worker-truck-unloaded', selectedWorker?.id, lastWorkerAccounting],
    queryFn: async () => {
      let sessionsQuery = supabase
        .from('loading_sessions')
        .select('id, created_at, status, notes, manager:workers!loading_sessions_manager_id_fkey(full_name)')
        .eq('worker_id', selectedWorker!.id)
        .eq('status', 'unloaded');
      if (lastWorkerAccounting) {
        sessionsQuery = sessionsQuery.gte('created_at', lastWorkerAccounting);
      }
      const { data: sessions } = await sessionsQuery;
      if (!sessions || sessions.length === 0) return [];
      const sessionIds = sessions.map((s) => s.id);
      const { data: items } = await supabase
        .from('loading_session_items')
        .select('session_id, product_id, quantity')
        .in('session_id', sessionIds);
      return items || [];
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  const { data: truckUnloadSessions = [] } = useQuery({
    queryKey: ['worker-truck-unload-sessions', selectedWorker?.id, lastWorkerAccounting],
    queryFn: async () => {
      let query = supabase
        .from('loading_sessions')
        .select('id, created_at, status, notes, manager:workers!loading_sessions_manager_id_fkey(full_name)')
        .eq('worker_id', selectedWorker!.id)
        .eq('status', 'unloaded');
      if (lastWorkerAccounting) {
        query = query.gte('created_at', lastWorkerAccounting);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  // Fetch sold quantities since last accounting
  const { data: truckSoldData } = useQuery({
    queryKey: ['worker-truck-sold', selectedWorker?.id, lastWorkerAccounting],
    queryFn: async () => {
      let ordersQuery = supabase
        .from('orders')
        .select('id, created_at, updated_at, payment_type, customer:customers(name, store_name, phone)')
        .eq('status', 'delivered')
        .or(`assigned_worker_id.eq.${selectedWorker!.id},created_by.eq.${selectedWorker!.id}`);
      if (lastWorkerAccounting) {
        ordersQuery = ordersQuery.gte('updated_at', lastWorkerAccounting);
      }
      const { data: orders } = await ordersQuery;
      if (!orders || orders.length === 0) return [];
      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, gift_quantity, gift_offer_id')
        .in('order_id', orderIds);
      if (!items || items.length === 0) return [];
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
      const orderMap = new Map(
        orders.map((order: any) => [
          order.id,
          {
            created_at: order.created_at,
            updated_at: order.updated_at,
            payment_type: order.payment_type,
            customer_name: order.customer?.name || null,
            customer_store_name: order.customer?.store_name || null,
            customer_phone: order.customer?.phone || null,
          },
        ])
      );
      return items.map((i) => {
        const order = orderMap.get(i.order_id);
        return {
          ...i,
          gift_unit: i.gift_offer_id ? (offerUnits[i.gift_offer_id] || 'piece') : 'piece',
          order_created_at: order?.created_at || null,
          order_updated_at: order?.updated_at || null,
          order_payment_type: order?.payment_type || null,
          customer_name: order?.customer_name || null,
          customer_store_name: order?.customer_store_name || null,
          customer_phone: order?.customer_phone || null,
        };
      });
    },
    enabled: !!selectedWorker?.id && truckStockOpen,
  });

  const truckMovementStats = useMemo(() => {
    const stats: Record<
      string,
      {
        loaded: number;
        unloaded: number;
        sold: number;
        giftQty: number;
        giftUnit: string;
        loadSessionIds: Set<string>;
        unloadSessionIds: Set<string>;
        saleOrderIds: Set<string>;
      }
    > = {};

    const ensure = (productId: string) => {
      if (!stats[productId]) {
        stats[productId] = {
          loaded: 0,
          unloaded: 0,
          sold: 0,
          giftQty: 0,
          giftUnit: 'piece',
          loadSessionIds: new Set(),
          unloadSessionIds: new Set(),
          saleOrderIds: new Set(),
        };
      }
      return stats[productId];
    };

    for (const item of (truckLoadedData || [])) {
      const stat = ensure(item.product_id);
      const movedQty = Number(item.quantity || 0) + Number(item.gift_quantity || 0);
      stat.loaded += movedQty;
      if (movedQty > 0 && item.session_id) stat.loadSessionIds.add(String(item.session_id));
      if ((item.gift_quantity || 0) > 0) {
        stat.giftQty += Number(item.gift_quantity || 0);
      }
    }

    for (const item of (truckUnloadedData || [])) {
      const stat = ensure(item.product_id);
      const movedQty = Number(item.quantity || 0);
      stat.unloaded += movedQty;
      if (movedQty > 0 && item.session_id) stat.unloadSessionIds.add(String(item.session_id));
    }

    for (const item of (truckSoldData || [])) {
      const stat = ensure(item.product_id);
      const paidQty = Math.max(0, Number(item.quantity || 0) - Number(item.gift_quantity || 0));
      stat.sold += paidQty;
      if (paidQty > 0 && item.order_id) stat.saleOrderIds.add(String(item.order_id));
      if ((item.gift_quantity || 0) > 0) {
        stat.giftQty += Number(item.gift_quantity || 0);
        stat.giftUnit = (item as any).gift_unit || 'piece';
      }
    }

    return stats;
  }, [truckLoadedData, truckSoldData, truckUnloadedData]);

  const selectedTruckProductHistory = useMemo(() => {
    if (!selectedTruckProduct) return null;
    const productId = selectedTruckProduct.product_id;
    const productName = selectedTruckProduct.product?.name || 'المنتج';
    const productImage = selectedTruckProduct.product?.image_url || null;
    const currentQty = Number(selectedTruckProduct.quantity || 0);
    const lastAccountingLabel = lastWorkerAccounting
      ? new Date(lastWorkerAccounting).toLocaleString('ar-DZ', { dateStyle: 'short', timeStyle: 'short' })
      : null;

    const loadSessionMap = new Map((truckLoadSessions || []).map((session: any) => [session.id, session]));
    const unloadSessionMap = new Map((truckUnloadSessions || []).map((session: any) => [session.id, session]));

    const entries: Array<{
      id: string;
      type: 'load' | 'unload' | 'sale' | 'gift';
      label: string;
      quantity: number;
      before: number;
      after: number;
      when: string;
      note?: string | null;
      paymentType?: string | null;
      customerName?: string | null;
      customerStoreName?: string | null;
      customerPhone?: string | null;
      sourceLabel?: string | null;
      sourceStatus?: string | null;
      delta: number;
    }> = [];

    const rawMovements: Array<{
      id: string;
      type: 'load' | 'unload' | 'sale' | 'gift';
      label: string;
      quantity: number;
      when: string;
      note?: string | null;
      paymentType?: string | null;
      customerName?: string | null;
      customerStoreName?: string | null;
      customerPhone?: string | null;
      sourceLabel?: string | null;
      sourceStatus?: string | null;
      delta: number;
    }> = [];

    const loadedItems = (truckLoadedData || [])
      .filter((item: any) => item.product_id === productId)
      .map((item: any) => {
        const session = loadSessionMap.get(item.session_id);
        const giftQty = toGiftTruckQty(item.gift_quantity || 0);
        const qty = Number(item.quantity || 0) + giftQty;
        return {
          id: `load-${item.session_id || item.product_id}-${item.previous_quantity || 0}-${qty}-${item.gift_quantity || 0}`,
          type: 'load' as const,
          label: 'شحن',
          quantity: qty,
          when: session?.created_at || '',
          note: session?.notes || null,
          sourceLabel: session?.manager?.full_name || null,
          sourceStatus: session?.status || null,
          delta: qty,
        };
      });

    const unloadItems = (truckUnloadedData || [])
      .filter((item: any) => item.product_id === productId)
      .map((item: any) => {
        const session = unloadSessionMap.get(item.session_id);
        return {
          id: `unload-${item.session_id || item.product_id}-${item.quantity}`,
          type: 'unload' as const,
          label: 'تفريغ',
          quantity: Number(item.quantity || 0),
          when: session?.created_at || '',
          note: session?.notes || null,
          sourceLabel: session?.manager?.full_name || null,
          sourceStatus: session?.status || null,
          delta: -Number(item.quantity || 0),
        };
      });

    const soldItems = (truckSoldData || [])
      .filter((item: any) => item.product_id === productId)
      .map((item: any) => {
        const saleQty = Math.max(0, Number(item.quantity || 0));
        const giftQty = toGiftTruckQty(item.gift_quantity || 0);
        const when = item.order_updated_at || item.order_created_at || '';
        const paymentType = item.order_payment_type || null;
        const customerName = item.customer_name || null;
        const customerStoreName = item.customer_store_name || null;
        const customerPhone = item.customer_phone || null;

        const saleMovement =
          saleQty > 0
            ? {
                id: `sale-${item.order_id || item.product_id}-${when}-${saleQty}`,
                type: 'sale' as const,
                label: 'بيع',
                quantity: saleQty,
                when,
                note: giftQty > 0 ? `هدايا ${formatTruckQty(giftQty)}` : null,
                paymentType,
                customerName,
                customerStoreName,
                customerPhone,
                delta: -saleQty,
              }
            : null;

        const giftMovement =
          giftQty > 0
            ? {
                id: `gift-${item.order_id || item.product_id}-${when}-${giftQty}`,
                type: 'gift' as const,
                label: 'هدية',
                quantity: giftQty,
                when,
                note: giftQty > 0 ? `من نفس عملية البيع` : null,
                paymentType,
                customerName,
                customerStoreName,
                customerPhone,
                delta: -giftQty,
              }
            : null;

        return [saleMovement, giftMovement].filter(Boolean);
      });

    rawMovements.push(...loadedItems, ...unloadItems, ...soldItems.flat());
    rawMovements.sort((a, b) => {
      const aTime = a.when ? new Date(a.when).getTime() : 0;
      const bTime = b.when ? new Date(b.when).getTime() : 0;
      return aTime - bTime;
    });

    const totalLoaded = loadedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalUnloaded = unloadItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSold = soldItems.flat().filter((item) => item?.type === 'sale').reduce((sum, item: any) => sum + item.quantity, 0);
    const totalGift = soldItems.flat().filter((item) => item?.type === 'gift').reduce((sum, item: any) => sum + item.quantity, 0);
    const chronological = [...rawMovements].reverse();
    let remainingBalance = currentQty;
    const historyEntries = chronological.map((movement) => {
      const after = remainingBalance;
      const before = remainingBalance - movement.delta;
      remainingBalance = before;
      return { ...movement, before, after };
    });

    return {
      productId,
      productName,
      productImage,
      currentQty,
      computedCurrent: currentQty,
      entries: historyEntries,
      totalLoaded,
      totalUnloaded,
      totalSold,
      totalGift,
      loadCount: loadedItems.filter((item) => item.delta > 0).length,
      unloadCount: unloadItems.length,
      saleCount: soldItems.flat().filter((item) => item?.type === 'sale').length,
      giftCount: soldItems.flat().filter((item) => item?.type === 'gift').length,
      lastAccountingLabel,
      hasMismatch: false,
    };
  }, [selectedTruckProduct, truckLoadedData, truckSoldData, truckUnloadedData, truckLoadSessions, truckUnloadSessions, t]);

  const handleSelectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setContextWorker(worker.id, worker.full_name);
  };

  const handleBack = () => {
    setSelectedWorker(null);
    setContextWorker(null);
  };

  const handleAction = (action: typeof workerActions[0]) => {
    if (!selectedWorker) return;
    if ((action as any).isDialog) {
      if (action.key === 'coin_exchange') {
        setCoinExchangeOpen(true);
      } else if (action.key === 'handover_summary') {
        setHandoverOpen(true);
      } else if (action.key === 'today_customers') {
        setTodayCustomersOpen(true);
      } else if (action.key === 'financial') {
        setFinancialOpen(true);
      } else if (action.key === 'points_log') {
        setPointsLogOpen(true);
      } else if (action.key === 'truck_stock') {
        setTruckStockOpen(true);
      } else if (action.key === 'stock_review') {
        setStockReviewOpen(true);
      } else if (action.key === 'attendance_log') {
        setAttendanceLogOpen(true);
      } else if (action.key === 'sales_summary') {
        setSalesSummaryOpen(true);
      } else if (action.key === 'gifts_summary') {
        setGiftsSummaryOpen(true);
      } else if (action.key === 'worker_profile') {
        setWorkerProfileOpen(true);
      } else if (action.key === 'achievements') {
        navigate(`/my-achievements?worker=${selectedWorker.id}&name=${encodeURIComponent(selectedWorker.full_name)}`);
      } else if (action.key === 'sector_schedule') {
        setSectorScheduleType('delivery');
        setSectorScheduleOpen(true);
      } else if (action.key === 'sector_coverage') {
        setSectorCoverageOpen(true);
      } else if (action.key === 'orders_summary') {
        setOrdersSummaryOpen(true);
      } else if (action.key === 'exchange_damaged') {
        setExchangeDamagedOpen(true);
      }
      return;
    }
    if (action.key === 'tracking') {
      navigate(`${action.path}?worker=${selectedWorker.id}`);
      return;
    }
    if (action.key === 'session_history') {
      navigate(`${action.path}?worker=${selectedWorker.id}&history=1`);
      return;
    }
    navigate(action.path);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        {selectedWorker && !isSelfMode && (
          <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-xl font-bold">
          {isSelfMode ? t('worker_actions.my_actions') : selectedWorker ? selectedWorker.full_name : t('worker_actions.title')}
        </h2>
        {selectedWorker && liability && (
          <Badge variant={liability.totalLiability > 0 ? 'destructive' : 'outline'} className="mr-auto text-xs">
            {t('liability.title')}: {liability.totalLiability.toLocaleString('ar-DZ')} د.ج
          </Badge>
        )}
      </div>


      {selectedWorker && !isSelfMode && !isSupervisorMode && !isWarehouseMode && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setWorkerProfileOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <Settings className="w-4 h-4" />
            {t('worker_actions.worker_settings')}
          </button>
        </div>
      )}


      {!selectedWorker ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {workers.map((worker, index) => {
            const colorSet = WORKER_CARD_COLORS[index % WORKER_CARD_COLORS.length];
            const todaySectors = workerTodaySectors[worker.id];
            const roleLabel = workerRoleLabels[worker.id] || (worker.role === 'worker' ? t('nav.workers') : worker.role);

            return (
              <div
                key={worker.id}
                className={`flex flex-col items-center justify-center p-3 gap-1.5 rounded-xl border-2 cursor-pointer active:scale-95 transition-all hover:shadow-lg ${colorSet.bg} ${colorSet.border}`}
                onClick={() => handleSelectWorker(worker)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorSet.icon}`}>
                  <HardHat className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-center leading-tight text-foreground">{worker.full_name}</span>
                <span className={`text-[10px] font-medium ${colorSet.accent}`}>{roleLabel}</span>

                {todaySectors && (todaySectors.delivery.length > 0 || todaySectors.sales.length > 0) && (
                  <div className="w-full mt-1 space-y-0.5">
                    {todaySectors.delivery.length > 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground bg-background/60 rounded px-1.5 py-0.5">
                        <Truck className="w-3 h-3 shrink-0" />
                        <span className="truncate">{t('worker_actions.delivery_sectors')} {todaySectors.delivery.join('، ')}</span>
                      </div>
                    )}
                    {todaySectors.sales.length > 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground bg-background/60 rounded px-1.5 py-0.5">
                        <ShoppingCart className="w-3 h-3 shrink-0" />
                        <span className="truncate">{t('worker_actions.sales_sectors')} {todaySectors.sales.join('، ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="grid !grid-cols-4 gap-1.5"
          style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
        >
          {workerActions.filter(action => {
            // Hide worker_profile for supervisors
            if (isSupervisorMode && action.key === 'worker_profile') return false;
            // Admin sees all, others check UI overrides
            if (isAdminRole(role)) return true;
            const overrideKey = `wa_${action.key}`;
            return !myOverrides?.some(o => o.element_type === 'button' && o.element_key === overrideKey && o.is_hidden);
          }).map((action) => (
            <div
              key={action.key}
              className={`flex min-w-0 flex-col items-center justify-center p-2 gap-1 rounded-lg border cursor-pointer active:scale-95 transition-all hover:shadow-md ${action.color}`}
              onClick={() => handleAction(action)}
            >
              <action.icon className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-medium text-center leading-tight break-words">{t(action.labelKey)}</span>
            </div>
          ))}
        </div>
      )}
      <CoinExchangeDialog open={coinExchangeOpen} onOpenChange={setCoinExchangeOpen} preselectedWorkerId={selectedWorker?.id} />
      <WorkerHandoverPreviewDialog
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
        targetWorkerId={selectedWorker?.id}
        targetWorkerName={selectedWorker?.full_name}
      />
      <TodayCustomersDialog
        open={todayCustomersOpen}
        onOpenChange={setTodayCustomersOpen}
        targetWorkerId={selectedWorker?.id}
        targetWorkerName={selectedWorker?.full_name}
      />
      <WorkerFinancialDialog
        open={financialOpen}
        onOpenChange={setFinancialOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />
      <WorkerPointsDialog
        open={pointsLogOpen}
        onOpenChange={setPointsLogOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />

      {/* Truck Stock Dialog */}
      {selectedWorker && (
        <Dialog open={truckStockOpen} onOpenChange={setTruckStockOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                مجموع الشاحنة {selectedWorker.full_name}
              </DialogTitle>
              {selectedTruckProductHistory?.lastAccountingLabel && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" />
                  آخر محاسبة: {selectedTruckProductHistory?.lastAccountingLabel}
                </div>
              )}
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {truckStock.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>{t('worker_actions.no_truck_stock')}</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {[...truckStock]
                    .sort((a: any, b: any) => {
                      if (a.quantity === 0 && b.quantity > 0) return 1;
                      if (a.quantity > 0 && b.quantity === 0) return -1;
                      return ((a as any).product?.name || '').localeCompare((b as any).product?.name || '');
                    })
                    .map((item: any) => {
                      const stats = truckMovementStats[item.product_id];
                      const loaded = stats?.loaded || 0;
                      const unloaded = stats?.unloaded || 0;
                      const sold = stats?.sold || 0;
                      const giftQty = stats?.giftQty || 0;
                      const giftUnit = stats?.giftUnit === 'piece' ? t('worker_actions.piece') : stats?.giftUnit === 'box' ? t('worker_actions.box') : stats?.giftUnit === 'kg' ? t('worker_actions.kg') : t('worker_actions.piece');
                      const loadCount = stats?.loadSessionIds?.size || 0;
                      const unloadCount = stats?.unloadSessionIds?.size || 0;
                      const saleCount = stats?.saleOrderIds?.size || 0;
                      const isZero = item.quantity === 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`w-full p-3 rounded-xl border text-start transition-all active:scale-[0.99] hover:shadow-md ${
                            isZero ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border'
                          }`}
                          onClick={() => {
                            setSelectedTruckProduct(item);
                            setTruckProductHistoryOpen(true);
                          }}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl border bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.product?.image_url ? (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product?.name || ''}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-sm truncate">{item.product?.name}</span>
                                <span className={`font-bold text-lg leading-none ${isZero ? 'text-destructive' : 'text-primary'}`}>
                                  {formatTruckQty(Number(item.quantity || 0))}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                انقر لعرض سجل الحركة
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] border-t pt-2 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-semibold">
                              <Package className="w-3 h-3" />
                              الباقي {formatTruckQty(Number(item.quantity || 0))}
                            </span>
                            <span className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full font-semibold">
                              <Package className="w-3 h-3" />
                              المجموع {formatTruckQty(loaded)}
                            </span>
                            <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                              <TrendingUp className="w-3 h-3" />
                              شحن {formatTruckQty(loaded)}
                              {loadCount > 0 && <span className="font-bold">×{loadCount}</span>}
                            </span>
                            <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                              <PackageOpen className="w-3 h-3" />
                              تفريغ -{formatTruckQty(unloaded)}
                              {unloadCount > 0 && <span className="font-bold">×{unloadCount}</span>}
                            </span>
                            <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                              <TrendingDown className="w-3 h-3" />
                              مباع {formatTruckQty(sold)}
                              {saleCount > 0 && <span className="font-bold">×{saleCount}</span>}
                            </span>
                            {giftQty > 0 && (
                              <span className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
                                <Gift className="w-3 h-3" />
                                هدايا {formatTruckQty(giftQty)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {selectedWorker && selectedTruckProductHistory && (
        <Dialog
          open={truckProductHistoryOpen}
          onOpenChange={(open) => {
            setTruckProductHistoryOpen(open);
            if (!open) setSelectedTruckProduct(null);
          }}
        >
            <DialogContent className="max-w-md h-[90vh] flex flex-col overflow-hidden" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <History className="w-5 h-5 text-primary" />
                  <span className="truncate">{selectedTruckProductHistory.productName}</span>
                  {selectedTruckProductHistory.lastAccountingLabel && (
                    <span className="text-[11px] font-normal text-muted-foreground whitespace-nowrap">
                      آخر جلسة: {selectedTruckProductHistory.lastAccountingLabel}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

            <div className="space-y-3 flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <div className="w-14 h-14 rounded-xl overflow-hidden border bg-background flex items-center justify-center shrink-0">
                  {selectedTruckProductHistory.productImage ? (
                    <img
                      src={selectedTruckProductHistory.productImage}
                      alt={selectedTruckProductHistory.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{selectedTruckProductHistory.productName}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200">المجموع {formatTruckQty(selectedTruckProductHistory.totalLoaded)}</Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">شحن {formatTruckQty(selectedTruckProductHistory.totalLoaded)}</Badge>
                    <Badge className="bg-red-100 text-red-700 border-red-200">تفريغ {formatTruckQty(selectedTruckProductHistory.totalUnloaded)}</Badge>
                    <Badge className="bg-green-100 text-green-700 border-green-200">مباع {formatTruckQty(selectedTruckProductHistory.totalSold)}</Badge>
                    {selectedTruckProductHistory.totalGift > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">هدايا {formatTruckQty(selectedTruckProductHistory.totalGift)}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    الباقي {formatTruckQty(selectedTruckProductHistory.currentQty)}
                  </div>
                </div>
              </div>

              {selectedTruckProductHistory.hasMismatch && (
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                  تنبيه: الرصيد المحسوب {selectedTruckProductHistory.computedCurrent} بينما المسجل فعليًا {selectedTruckProductHistory.currentQty}
                </div>
              )}

                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="space-y-2 pb-2">
                    {selectedTruckProductHistory.entries.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground border rounded-xl">
                        لا توجد حركات مسجلة لهذا المنتج
                      </div>
                  ) : (
                    selectedTruckProductHistory.entries.map((entry, index) => {
                      const prevDay = selectedTruckProductHistory.entries[index - 1]?.when
                        ? new Date(selectedTruckProductHistory.entries[index - 1].when).toDateString()
                        : null;
                      const currentDay = entry.when ? new Date(entry.when).toDateString() : null;
                      const showDay = index === 0 || prevDay !== currentDay;
                      const dateLabel = entry.when ? new Date(entry.when).toLocaleDateString('ar-DZ') : '—';
                      const timeLabel = entry.when ? new Date(entry.when).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) : '';
                      const deltaLabel = entry.type === 'load' ? `+${entry.quantity}` : `-${entry.quantity}`;
                      const typeBadge =
                        entry.type === 'load'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : entry.type === 'unload'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : entry.type === 'gift'
                              ? 'bg-orange-100 text-orange-700 border-orange-200'
                              : 'bg-green-100 text-green-700 border-green-200';

                      return (
                        <div key={entry.id} className="space-y-1">
                          {showDay && (
                            <div className="text-center text-[11px] font-semibold text-muted-foreground pt-1">
                              {dateLabel}
                            </div>
                          )}
                          <div className={`rounded-xl border px-3 py-2.5 ${entry.type === 'unload' ? 'bg-red-50 border-red-200' : entry.type === 'sale' ? 'bg-green-50 border-green-200' : entry.type === 'gift' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className={`text-[10px] ${typeBadge}`}>
                                    {entry.label}
                                  </Badge>
                                  {entry.type === 'sale' && entry.paymentType && (
                                    <Badge className="text-[10px] bg-muted text-foreground border-border">
                                      {entry.paymentType}
                                    </Badge>
                                  )}
                                  {entry.type !== 'sale' && entry.sourceLabel && (
                                    <span className="text-[11px] text-muted-foreground">
                                      {entry.sourceLabel}
                                    </span>
                                  )}
                                </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {timeLabel || '—'}
                                {entry.customerStoreName ? ` • ${entry.customerStoreName}` : ''}
                                {entry.customerName && entry.customerName !== entry.customerStoreName ? ` • ${entry.customerName}` : ''}
                              </div>
                            </div>
                            <div className={`text-sm font-bold ${entry.type === 'unload' ? 'text-red-700' : entry.type === 'sale' ? 'text-green-700' : 'text-blue-700'}`}>
                                {deltaLabel.startsWith('-')
                                  ? `-${formatTruckQty(Math.abs(entry.quantity))}`
                                  : `+${formatTruckQty(entry.quantity)}`
                                }
                              </div>
                            </div>
                            <div className="mt-2 text-[11px]">
                              <div className="rounded-lg bg-background/70 p-2 flex items-center justify-between gap-2">
                                <div className="text-muted-foreground">الباقي</div>
                                <div className="font-semibold">{formatTruckQty(entry.after)}</div>
                              </div>
                            </div>
                            {entry.note && (
                              <div className="mt-2 text-[11px] text-muted-foreground border-t pt-2">
                                {entry.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
      )}

      {/* Stock Review Dialog */}
      {selectedWorker && (
        <StockVerificationDialog
          open={stockReviewOpen}
          onOpenChange={setStockReviewOpen}
          workerId={selectedWorker.id}
        />
      )}
      <WorkerAttendanceLogDialog
        open={attendanceLogOpen}
        onOpenChange={setAttendanceLogOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />
      <WorkerSalesSummaryDialog
        open={salesSummaryOpen}
        onOpenChange={setSalesSummaryOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />
      <WorkerGiftsSummaryDialog
        open={giftsSummaryOpen}
        onOpenChange={setGiftsSummaryOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />
      <EditWorkerProfileDialog
        open={workerProfileOpen}
        onOpenChange={setWorkerProfileOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />
      <SectorScheduleDialog
        open={sectorScheduleOpen}
        onOpenChange={setSectorScheduleOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
        workerType={sectorScheduleType}
      />
      <WorkerOrdersSummaryDialog
        open={ordersSummaryOpen}
        onOpenChange={setOrdersSummaryOpen}
        workerId={selectedWorker?.id}
        workerName={selectedWorker?.full_name}
      />
      <SectorCoverageDialog
        open={sectorCoverageOpen}
        onOpenChange={setSectorCoverageOpen}
      />
      {selectedWorker && activeBranch?.id && (
        <ExchangeSessionDialog
          open={exchangeDamagedOpen}
          onOpenChange={setExchangeDamagedOpen}
          workerId={selectedWorker.id}
          workerName={selectedWorker.full_name}
          branchId={activeBranch.id}
        />
      )}
    </div>
  );
};

export default WorkerActions;
