import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, Branch } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedName } from '@/utils/sectorName';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { UserPlus, User, Loader2, Trash2, Phone, MapPin, Search, Pencil, Building2, ChevronDown, ChevronUp, Navigation, Shield, Tag, UserCircle, Store, CreditCard, Warehouse, Eye, PlusCircle, Banknote, Truck, AlertTriangle, ShoppingBag, Calendar, Package, MapPinPlus, FileEdit, Settings2, BadgeCheck, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ALGERIAN_WILAYAS, DEFAULT_WILAYA } from '@/data/algerianWilayas';
import LazyLocationPicker from '@/components/map/LazyLocationPicker';
import AddCustomerDialog from '@/components/promo/AddCustomerDialog';
import EditCustomerDialog from '@/components/orders/EditCustomerDialog';
import LazyCustomersMapView from '@/components/map/LazyCustomersMapView';
import CustomerSpecialPricesDialog from '@/components/customers/CustomerSpecialPricesDialog';
import ManageSectorsDialog from '@/components/customers/ManageSectorsDialog';
import { useSectors } from '@/hooks/useSectors';
import { useCustomerTypes, getCustomerTypeLabel, getCustomerTypeColor } from '@/hooks/useCustomerTypes';
import { useTrackVisit } from '@/hooks/useVisitTracking';
import CustomerProfileDialog from '@/components/customers/CustomerProfileDialog';
import CustomerApprovalTab from '@/components/customers/CustomerApprovalTab';
import CustomerChangeReviewDialog from '@/components/customers/CustomerChangeReviewDialog';
import WorkerMyRequestsTab from '@/components/customers/WorkerMyRequestsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { fr } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsElementHidden } from '@/hooks/useUIOverrides';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import CustomerFieldSettingsDialog from '@/components/customers/CustomerFieldSettingsDialog';
import { useCustomerFieldSettings } from '@/hooks/useCustomerFieldSettings';
import { CUSTOMER_FIELD_LABELS, CustomerActionButtonKey } from '@/types/customerFieldSettings';
import { isAdminRole } from '@/lib/utils';

// Normalize Arabic text: treat all alef variants and hamza as the same
const normalizeArabic = (text: string): string =>
  text.replace(/[إأآءٱ]/g, 'ا').replace(/[ىة]/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');

// Collapsible sector group component
const SectorCustomerGroup: React.FC<{ label: string; count: number; forceOpen?: boolean; defaultOpen: boolean; children: React.ReactNode }> = ({ label, count, forceOpen, defaultOpen, children }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  React.useEffect(() => { setIsOpen(defaultOpen); }, [defaultOpen]);
  React.useEffect(() => { if (forceOpen !== undefined) setIsOpen(forceOpen); }, [forceOpen]);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="sticky top-0 z-10 w-full bg-muted/80 backdrop-blur-sm px-4 py-2 border-b border-t flex items-center justify-between rounded-lg">
          <p className="text-xs font-bold text-primary">{label} ({count})</p>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 mt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { workerId, activeBranch, role } = useAuth();
  const { t, language } = useLanguage();
  const { sectors } = useSectors();
  const { customerTypes } = useCustomerTypes();
  const { trackVisit } = useTrackVisit();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSectorsDialog, setShowSectorsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [missingFilter, setMissingFilter] = useState<string>('all');
  const [sectorZones, setSectorZones] = useState<{ id: string; name: string; name_fr: string | null; sector_id: string }[]>([]);
  const [allZones, setAllZones] = useState<{ id: string; name: string; name_fr: string | null; sector_id: string }[]>([]);
  const [expandAllSectors, setExpandAllSectors] = useState(false);
  const isAddCustomerHidden = useIsElementHidden('button', 'add_customer');
  const isEditCustomerHidden = useIsElementHidden('action', 'edit_customer');
  const isDeleteCustomerHidden = useIsElementHidden('action', 'delete_customer');
  const isViewProfileHidden = useIsElementHidden('action', 'view_customer_profile');

  // Edit dialog state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Delete state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Special prices dialog
  const [customerForPrices, setCustomerForPrices] = useState<Customer | null>(null);

  const isManager = isAdminRole(role);
  const [activeTab, setActiveTab] = useState('list');
  const [requestsCount, setRequestsCount] = useState(0);
  const [showFieldSettingsDialog, setShowFieldSettingsDialog] = useState(false);
  const { settings: customerFieldSettings } = useCustomerFieldSettings();

  // Realtime subscription for instant badge updates + customer data updates
  useRealtimeSubscription(
    'customer-approval-requests-realtime',
    [{ table: 'customer_approval_requests' }, { table: 'customers' }],
    [['customer-approval-requests']],
    true
  );

  // Re-fetch counts and customer data when realtime triggers
  useEffect(() => {
    const baseChannelName = 'customers-realtime-refresh';
    const existing = (supabase as any).getChannels?.()?.find((ch: any) => ch.topic === `realtime:${baseChannelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase.channel(`${baseChannelName}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_approval_requests' }, () => {
        fetchRequestsCount();
        fetchPendingRequestsPerCustomer();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Pending approval requests per customer (full data)
  const [pendingRequestsMap, setPendingRequestsMap] = useState<Record<string, any[]>>({});

  // Review dialog state
  const [reviewCustomer, setReviewCustomer] = useState<Customer | null>(null);

  // Last orders cache
  const [lastOrders, setLastOrders] = useState<Record<string, any>>({});
  const [lastOrderDialogCustomer, setLastOrderDialogCustomer] = useState<Customer | null>(null);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);
  const [loadingLastOrder, setLoadingLastOrder] = useState(false);

  useEffect(() => {
    if (isManager) {
      fetchRequestsCount();
    }
    fetchPendingRequestsPerCustomer();
  }, [isManager, activeBranch]);

  const fetchRequestsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('customer_approval_requests' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error) {
        setRequestsCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching requests count:', err);
    }
  };

  const fetchPendingRequestsPerCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_approval_requests' as any)
        .select('id, customer_id, operation_type, payload, requested_by, created_at, workers!customer_approval_requests_requested_by_fkey(full_name)')
        .eq('status', 'pending');
      if (!error && data) {
        const map: Record<string, any[]> = {};
        (data as any[]).forEach((r: any) => {
          if (r.customer_id) {
            if (!map[r.customer_id]) map[r.customer_id] = [];
            map[r.customer_id].push({ ...r, requester_name: r.workers?.full_name });
          }
        });
        setPendingRequestsMap(map);
      }
    } catch (err) {
      console.error('Error fetching pending requests per customer:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Fetch all zones for badge display
    supabase.from('sector_zones').select('*').order('name').then(({ data }) => {
      setAllZones((data || []) as any);
    });
  }, []);

  // Filter customers by activeBranch
  const filteredByBranch = useMemo(() => {
    if (isAdminRole(role) && activeBranch) {
      return customers.filter(c => c.branch_id === activeBranch.id || c.branch_id === null);
    }
    return customers;
  }, [customers, activeBranch, role]);

  const getCustomerCompletion = (customer: Customer) => {
    const fieldStatus = {
      name: !!customer.name?.trim(),
      name_fr: !!customer.name_fr?.trim(),
      phone: !!customer.phone?.trim(),
      store_name: !!customer.store_name?.trim(),
      customer_type: !!customer.customer_type,
      internal_name: !!customer.internal_name?.trim(),
      sales_rep_name: !!customer.sales_rep_name?.trim(),
      sector_id: !!customer.sector_id,
      zone_id: !!customer.zone_id,
      address: !!customer.address?.trim(),
      wilaya: !!customer.wilaya,
      location: !!(customer.latitude && customer.longitude),
      default_delivery_worker_id: !!customer.default_delivery_worker_id,
    };

    const completionKeys = customerFieldSettings.completionFields;
    const requiredKeys = customerFieldSettings.requiredOnEdit;

    const filled = completionKeys.filter((key) => fieldStatus[key]).length;
    const percent = completionKeys.length === 0 ? 100 : Math.round((filled / completionKeys.length) * 100);
    const missing = requiredKeys
      .filter((key) => !fieldStatus[key])
      .map((key) => ({
        key,
        label: CUSTOMER_FIELD_LABELS[key],
        icon: AlertTriangle,
      }));

    const missingCompletion = completionKeys
      .filter((key) => !fieldStatus[key])
      .map((key) => ({
        key,
        label: CUSTOMER_FIELD_LABELS[key],
      }));

    return { percent, missing, missingCompletion };
  };

  // Then filter by search query and sector
  const filteredCustomers = useMemo(() => {
    let filtered = filteredByBranch;

    if (sectorFilter !== 'all') {
      if (sectorFilter === 'none') {
        filtered = filtered.filter(c => !c.sector_id);
      } else {
        filtered = filtered.filter(c => c.sector_id === sectorFilter);
      }
    }

    if (zoneFilter !== 'all') {
      if (zoneFilter === 'none') {
        filtered = filtered.filter(c => !c.zone_id);
      } else {
        filtered = filtered.filter(c => c.zone_id === zoneFilter);
      }
    }

    if (typeFilter !== 'all') {
      if (typeFilter === 'none') {
        filtered = filtered.filter(c => !c.customer_type);
      } else {
        filtered = filtered.filter(c => c.customer_type === typeFilter);
      }
    }

    if (missingFilter !== 'all') {
      if (missingFilter === 'incomplete') {
        filtered = filtered.filter(c => {
          const { percent } = getCustomerCompletion(c);
          return percent < 100;
        });
      } else {
        filtered = filtered.filter(c => {
          switch (missingFilter) {
            case 'phone': return !c.phone?.trim() || c.phone?.trim() === '0555443322';
            case 'location': return !(c.latitude && c.longitude);
            case 'type': return !c.customer_type;
            case 'sector': return !c.sector_id;
            case 'store': return !c.store_name?.trim();
            case 'address': return !c.address?.trim();
            case 'wilaya': return !c.wilaya;
            case 'zone': return !c.zone_id;
            default: return true;
          }
        });
      }
    }

    if (searchQuery.trim()) {
      const query = normalizeArabic(searchQuery.toLowerCase());
      const match = (val: string | null | undefined) => val && normalizeArabic(val.toLowerCase()).includes(query);
      filtered = filtered.filter(c =>
        match(c.name) ||
        match(c.name_fr) ||
        match(c.internal_name) ||
        match(c.store_name) ||
        match(c.store_name_fr) ||
        c.phone?.includes(searchQuery) ||
        match(c.wilaya)
      );
    }
    return filtered;
  }, [searchQuery, filteredByBranch, sectorFilter, zoneFilter, typeFilter, missingFilter]);

  // Fetch last delivered orders for all customers
  useEffect(() => {
    if (customers.length > 0) {
      fetchLastOrders();
    }
  }, [customers]);

  const fetchLastOrders = async () => {
    try {
      // Fetch last orders with item count
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_id, created_at, total_amount, payment_status, status, order_items(id)')
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const map: Record<string, any> = {};
      for (const order of (data || [])) {
        if (!map[order.customer_id]) {
          map[order.customer_id] = { ...order, itemCount: order.order_items?.length || 0 };
        }
      }
      setLastOrders(map);
    } catch {
      // Silent fail
    }
  };

  const fetchData = async () => {
    try {
      const [customersRes, branchesRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('branches').select('*').eq('is_active', true).order('name')
      ]);

      if (customersRes.error) throw customersRes.error;
      if (branchesRes.error) throw branchesRes.error;

      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('common.loading'));
    } finally {
      setIsLoading(false);
    }
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return null;
    return branches.find(b => b.id === branchId)?.name;
  };

  const getSectorName = (sectorId: string | null | undefined) => {
    if (!sectorId) return null;
    const sector = sectors.find(s => s.id === sectorId);
    return sector ? getLocalizedName(sector, language) : null;
  };

  const getZoneName = (zoneId: string | null | undefined) => {
    if (!zoneId) return null;
    const zone = allZones.find(z => z.id === zoneId);
    return zone ? getLocalizedName(zone, language) : null;
  };

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAddDialog(false);
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setShowEditDialog(false);
    setEditingCustomer(null);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditDialog(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    if (isManager) {
      setIsDeleting(true);
      try {
        const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id);
        if (error) throw error;
        toast.success(t('common.delete') + ' ✓');
        setCustomerToDelete(null);
        fetchData();
      } catch (error: any) {
        console.error('Error deleting customer:', error);
        toast.error(error.message);
      } finally {
        setIsDeleting(false);
      }
    } else {
      setIsDeleting(true);
      try {
        const { error } = await supabase
          .from('customer_approval_requests' as any)
          .insert({
            operation_type: 'delete',
            customer_id: customerToDelete.id,
            payload: { customerName: customerToDelete.name },
            requested_by: workerId,
            branch_id: activeBranch?.id || customerToDelete.branch_id || null,
            status: 'pending'
          } as any);
        if (error) throw error;
        trackVisit({ customerId: customerToDelete.id, operationType: 'delete_customer', notes: `طلب حذف زبون: ${customerToDelete.name}` });
        toast.info(t('customers.delete_request_sent'));
        setCustomerToDelete(null);
        // Optimistic: update badge instantly
        fetchRequestsCount();
        fetchPendingRequestsPerCustomer();
      } catch (error: any) {
        console.error('Error creating delete request:', error);
        toast.error(error.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Fetch last order details
  const openLastOrderDetails = async (customer: Customer) => {
    const lastOrder = lastOrders[customer.id];
    if (!lastOrder) {
      toast.info(t('customers.no_previous_orders'));
      return;
    }
    setLastOrderDialogCustomer(customer);
    setLoadingLastOrder(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, product:products(name)')
        .eq('order_id', lastOrder.id);
      if (error) throw error;
      setLastOrderDetails({ ...lastOrder, items: data || [] });
    } catch {
      setLastOrderDetails(lastOrder);
    } finally {
      setLoadingLastOrder(false);
    }
  };

  // Fetch zones when sector filter changes
  useEffect(() => {
    setZoneFilter('all');
    if (sectorFilter && sectorFilter !== 'all' && sectorFilter !== 'none') {
      supabase.from('sector_zones').select('*').eq('sector_id', sectorFilter).order('name').then(({ data }) => {
        setSectorZones((data || []) as any);
      });
    } else {
      setSectorZones([]);
    }
  }, [sectorFilter]);

  const renderCustomersList = () => (
    <div className="space-y-2">
      {(() => {
        // Build sector groups
        const sectorGroups = new Map<string | null, Customer[]>();
        filteredCustomers.forEach(c => {
          const key = c.sector_id || null;
          if (!sectorGroups.has(key)) sectorGroups.set(key, []);
          sectorGroups.get(key)!.push(c);
        });

        const sectorIds = Array.from(sectorGroups.keys()).filter(k => k !== null) as string[];
        sectorIds.sort((a, b) => {
          const nameA = getSectorName(a) || '';
          const nameB = getSectorName(b) || '';
          return nameA.localeCompare(nameB, 'ar');
        });

        const groups: { key: string; label: string; customers: Customer[] }[] = [];
        sectorIds.forEach(sid => {
          groups.push({ key: sid, label: getSectorName(sid) || t('customers.unknown'), customers: sectorGroups.get(sid)! });
        });
        if (sectorGroups.has(null) && sectorGroups.get(null)!.length > 0) {
          groups.push({ key: 'no-sector', label: t('customers.no_sector'), customers: sectorGroups.get(null)! });
        }

        return groups.map(group => (
          <SectorCustomerGroup
            key={group.key}
            label={group.label}
            count={group.customers.length}
            defaultOpen={!!searchQuery.trim()}
            forceOpen={expandAllSectors}
          >
            {group.customers.map((customer) => {
              const { percent, missing, missingCompletion } = getCustomerCompletion(customer);
              const lastOrder = lastOrders[customer.id];
              return (
          <Card key={customer.id}>
            <CardContent className="p-3">
              {/* Customer Info Row */}
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm leading-tight flex items-center gap-0.5 flex-wrap">
                    {(() => {
                      const storeName = customer.store_name
                        ? (language === 'fr' && customer.store_name_fr ? customer.store_name_fr : customer.store_name)
                        : (language === 'fr' && customer.name_fr ? customer.name_fr : customer.name);
                      const typeEntry = customer.customer_type
                        ? customerTypes.find(t => t.ar === customer.customer_type)
                        : null;
                      const shortLabel = typeEntry?.short || typeEntry?.ar || '';
                      const pendingReqs = pendingRequestsMap[customer.id] || [];
                      const pendingCount = pendingReqs.length;
                      const pendingBadge = pendingCount > 0 ? (
                        <Badge 
                          className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 ml-1 cursor-pointer hover:bg-destructive/90"
                          onClick={(e) => { e.stopPropagation(); if (isManager) setReviewCustomer(customer); }}
                        >
                          طلب تعديل ({pendingCount})
                        </Badge>
                      ) : null;
                      const verifiedBadge = percent === 100 ? (
                        <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : null;
                      if (!shortLabel) return <>{storeName}{verifiedBadge}{pendingBadge}</>;
                      const typeColors = getCustomerTypeColor(typeEntry?.short || '', customerTypes.indexOf(typeEntry!), typeEntry);
                      return <><span className="inline-flex items-center text-[10px] px-1.5 py-0 font-mono uppercase ml-1 rounded-md font-semibold" style={{ backgroundColor: typeColors.bg, color: typeColors.text }}>{shortLabel}</span>{storeName}{verifiedBadge}{pendingBadge}</>;
                    })()}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {getSectorName(customer.sector_id) && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                        <MapPin className="w-2.5 h-2.5 ml-0.5" />
                        {getSectorName(customer.sector_id)}
                      </Badge>
                    )}
                    {getZoneName(customer.zone_id) && (
                      <Badge className="text-[10px] px-1.5 py-0 font-semibold border-0 bg-blue-600 text-white">
                        {getZoneName(customer.zone_id)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <User className="w-2.5 h-2.5 inline ml-0.5" />
                    {language === 'fr' && customer.name_fr ? customer.name_fr : customer.name}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {customer.internal_name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        {customer.internal_name}
                      </Badge>
                    )}
                    {customer.is_trusted && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0">
                        <Shield className="w-2.5 h-2.5 ml-0.5" />
                        {t('customers.trusted')}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {customer.default_payment_type === 'with_invoice' ? t('customers.invoice_1') :
                        customer.default_price_subtype === 'super_gros' ? t('customers.super_gros') :
                          customer.default_price_subtype === 'retail' ? t('customers.retail') : t('customers.wholesale')
                      }
                    </Badge>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span dir="ltr">{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {customer.wilaya && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {customer.wilaya}
                      </span>
                    )}
                    {customer.branch_id && (
                      <span className="flex items-center gap-0.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {getBranchName(customer.branch_id)}
                      </span>
                    )}
                  </div>
                  {customer.address && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{customer.address}</p>
                  )}
                  {(customer as any).updated_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                      <FileEdit className="w-2.5 h-2.5" />
                      آخر تحديث: {format(new Date((customer as any).updated_at), 'dd MMM yyyy HH:mm', { locale: language === 'ar' ? ar : language === 'fr' ? fr : enUS })}
                    </p>
                  )}
                  {lastOrder && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-primary/20">
                        <Calendar className="w-2.5 h-2.5" />
                        {t('customers.last_order_label')} {format(new Date(lastOrder.created_at), 'dd MMM yyyy', { locale: language === 'ar' ? ar : language === 'fr' ? fr : enUS })}
                        {' '}({differenceInDays(new Date(), new Date(lastOrder.created_at))} {t('customers.days')})
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                        {Number(lastOrder.total_amount || 0).toLocaleString()} {t('customers.currency')} ({lastOrder.itemCount || 0} {t('customers.product_count')})
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              {percent < 100 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Progress value={percent} className="h-1.5 flex-1" />
                    <span className={`text-[10px] font-semibold ${percent >= 60 ? 'text-muted-foreground' : 'text-destructive'}`}>{percent}%</span>
                  </div>
                  {missingCompletion.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {missingCompletion.map(m => (
                        <Badge key={m.key} variant="outline" className="text-[9px] px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/5">
                          {m.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {(() => {
                const ab = customerFieldSettings.actionButtons;
                const renderBtn = (key: CustomerActionButtonKey, icon: React.ReactNode, onClick: () => void, condition = true, extraClass = 'text-muted-foreground hover:text-primary hover:bg-primary/10') => {
                  const cfg = ab[key];
                  if (!cfg?.visible || !condition) return null;
                  return (
                    <Button key={key} variant="ghost" size={cfg.showLabel ? 'sm' : 'icon'} className={`h-7 ${cfg.showLabel ? 'px-2 gap-1 text-[10px]' : 'w-7'} ${extraClass}`} onClick={onClick} title={cfg.label}>
                      {icon}
                      {cfg.showLabel && <span>{cfg.label}</span>}
                    </Button>
                  );
                };
                return (
                  <div className="flex items-center justify-end gap-0 mt-2 border-t pt-1.5 flex-wrap">
                    {renderBtn('view_profile', <Eye className="w-3.5 h-3.5" />, () => { setProfileCustomer(customer); setIsProfileOpen(true); }, !isViewProfileHidden)}
                    {renderBtn('call', <Phone className="w-3.5 h-3.5" />, () => window.location.href = `tel:${customer.phone}`, !!customer.phone)}
                    {renderBtn('new_order', <PlusCircle className="w-3.5 h-3.5" />, () => navigate('/orders', { state: { customerId: customer.id, paymentType: customer.default_payment_type } }))}
                    {renderBtn('debts', <CreditCard className="w-3.5 h-3.5" />, () => navigate('/customer-debts', { state: { customerId: customer.id } }))}
                    {isManager && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-sky-700 hover:text-sky-800 hover:bg-sky-100"
                        onClick={() => navigate(`/customer-journey?customerId=${customer.id}`)}
                        title={t('nav.customer_journey')}
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {renderBtn('direct_sale', <Banknote className="w-3.5 h-3.5" />, () => navigate('/orders', { state: { customerId: customer.id, action: 'sale' } }))}
                    {renderBtn('delivery', <Truck className="w-3.5 h-3.5" />, () => navigate('/orders', { state: { customerId: customer.id, action: 'delivery' } }))}
                    {renderBtn('last_order', <ShoppingBag className="w-3.5 h-3.5" />, () => openLastOrderDetails(customer))}
                    {renderBtn('navigate', <Navigation className="w-3.5 h-3.5" />, () => window.open(`https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`, '_blank'), !!(customer.latitude && customer.longitude))}
                    {renderBtn('special_prices', <Tag className="w-3.5 h-3.5" />, () => setCustomerForPrices(customer))}
                    {isManager && (pendingRequestsMap[customer.id]?.length || 0) > 0 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setReviewCustomer(customer)} title={t('customers.review_changes')}>
                        <FileEdit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {renderBtn('edit', <Pencil className="w-3.5 h-3.5" />, () => openEditDialog(customer), !isEditCustomerHidden)}
                    {renderBtn('delete', <Trash2 className="w-3.5 h-3.5" />, () => setCustomerToDelete(customer), !isDeleteCustomerHidden, 'text-destructive hover:text-destructive hover:bg-destructive/10')}
                  </div>
                );
              })()}
            </CardContent>
           </Card>
           );
              })}
          </SectorCustomerGroup>
        ));
      })()}

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{searchQuery ? t('customers.no_results') : t('customers.no_customers')}</p>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 space-y-3 touch-pan-y">
      {/* Compact Header: Title + Stats + Actions merged */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{t('customers.title')}</h2>
            <p className="text-sm font-bold flex items-center gap-1">
              <span className="text-red-600">{filteredByBranch.length}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-blue-600">{filteredCustomers.length}</span>
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const todayCount = filteredByBranch.filter(c => c.created_at?.startsWith(today)).length;
                return todayCount > 0 ? <span className="text-emerald-700 mr-1"> ({todayCount}+)</span> : null;
              })()}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="icon" variant={expandAllSectors ? "default" : "secondary"} className="h-9 w-9" onClick={() => setExpandAllSectors(!expandAllSectors)} title={expandAllSectors ? t('customers.collapse_all') : t('customers.expand_all')}>
            {expandAllSectors ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          {isManager && (
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setShowSectorsDialog(true)} title={t('customers.sectors')}>
              <MapPinPlus className="w-4 h-4" />
            </Button>
          )}
          {isManager && (
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setShowFieldSettingsDialog(true)} title={t('customers.field_settings')}>
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
          {!isAddCustomerHidden && (
            <Button size="icon" className="h-9 w-9" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Integrated Search + Map toggle row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('customers.search')}
            className="pr-10 text-right h-9"
          />
        </div>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title={t('customers.locations_map')}>
              <MapPin className="w-4 h-4 text-primary" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="absolute left-3 right-3 z-20 mt-1">
            <Card className="shadow-xl border-primary/20">
              <CardContent className="p-2">
                <LazyCustomersMapView
                  customers={filteredCustomers}
                  onCustomerClick={(customer) => { setProfileCustomer(customer); setIsProfileOpen(true); }}
                  branchWilaya={activeBranch?.wilaya}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Compact Filters: Sector + Type + Expand in one strip */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {sectors.length > 0 && (
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder={t('customers.filter_by_sector')} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">{t('customers.all_sectors')}</SelectItem>
                <SelectItem value="none">{t('customers.no_sector')}</SelectItem>
                {sectors.map(s => (
                  <SelectItem key={s.id} value={s.id}>{getLocalizedName(s, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {sectorZones.length > 0 && sectorFilter !== 'all' && sectorFilter !== 'none' && (
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder={t('customers.all_areas')} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">{t('customers.all_areas')}</SelectItem>
                <SelectItem value="none">{t('customers.no_sector')} ({filteredByBranch.filter(c => c.sector_id === sectorFilter && !c.zone_id).length})</SelectItem>
                {sectorZones.map(z => {
                  const count = filteredByBranch.filter(c => c.zone_id === z.id).length;
                  return <SelectItem key={z.id} value={z.id}>{getLocalizedName(z, language)} ({count})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        {customerTypes.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <Button
              type="button"
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="text-[10px] h-6 px-2 rounded-full"
              onClick={() => setTypeFilter('all')}
            >
              {t('customers.all')}
            </Button>
            <Button
              type="button"
              variant={typeFilter === 'none' ? 'default' : 'outline'}
              size="sm"
              className="text-[10px] h-6 px-2 rounded-full"
              onClick={() => setTypeFilter('none')}
            >
              {t('customers.none')}
            </Button>
            {customerTypes.map((ct, idx) => {
              const colors = getCustomerTypeColor(ct.short, idx, ct);
              const isActive = typeFilter === ct.ar;
              return (
                <button
                  key={idx}
                  className={`text-[10px] h-6 px-2.5 rounded-full font-mono uppercase font-semibold transition-shadow ${isActive ? 'ring-2 ring-offset-1 ring-foreground/40' : ''}`}
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                  onClick={() => setTypeFilter(ct.ar)}
                >
                  {ct.short || ct.ar}
                </button>
              );
            })}
          </div>
        )}
        {/* Missing info filter */}
        <div className="flex gap-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-1">
            <AlertTriangle className="w-3 h-3" />
            {t('common.filter')}:
          </span>
          {[
            { value: 'all', label: t('customers.filter_all') },
            { value: 'incomplete', label: t('customers.filter_incomplete') },
            { value: 'phone', label: t('customers.filter_phone') },
            { value: 'location', label: t('customers.filter_location') },
            { value: 'type', label: t('customers.filter_type') },
            { value: 'sector', label: t('customers.filter_sector_label') },
            { value: 'store', label: t('customers.filter_store') },
            { value: 'address', label: t('customers.filter_address') },
            { value: 'wilaya', label: t('customers.filter_wilaya') },
            { value: 'zone', label: t('customers.filter_zone') },
          ].map(opt => (
            <Button
              key={opt.value}
              type="button"
              variant={missingFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              className={`text-[10px] h-6 px-2 rounded-full ${missingFilter === opt.value && opt.value !== 'all' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
              onClick={() => setMissingFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Interface */}
      {isManager ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="list" className="text-xs">{t('customers.title')}</TabsTrigger>
            <TabsTrigger value="requests" className="relative text-xs">
              {t('customers.review_requests')}
              {requestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {requestsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2 mt-2 overflow-visible overscroll-auto">
            {renderCustomersList()}
          </TabsContent>

          <TabsContent value="requests" className="overflow-visible overscroll-auto">
            <CustomerApprovalTab />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="list" className="text-xs">{t('customers.title')}</TabsTrigger>
            <TabsTrigger value="my-requests" className="relative text-xs">
              طلباتي
              {(() => {
                const myPendingCount = Object.values(pendingRequestsMap).flat().filter((r: any) => r.requested_by === workerId).length;
                return myPendingCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                    {myPendingCount}
                  </span>
                ) : null;
              })()}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2 mt-2 overflow-visible overscroll-auto">
            {renderCustomersList()}
          </TabsContent>

          <TabsContent value="my-requests" className="overflow-visible overscroll-auto">
            <WorkerMyRequestsTab />
          </TabsContent>
        </Tabs>
      )}

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleCustomerAdded}
      />

      {/* Edit Customer Dialog - using unified component */}
      <EditCustomerDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSuccess={handleCustomerUpdated}
      />

      <CustomerFieldSettingsDialog
        open={showFieldSettingsDialog}
        onOpenChange={setShowFieldSettingsDialog}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customers.delete_confirm')} "{customerToDelete?.name}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (<><Loader2 className="w-4 h-4 ml-2 animate-spin" />{t('common.loading')}</>) : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Special Prices Dialog */}
      <CustomerSpecialPricesDialog
        open={!!customerForPrices}
        onOpenChange={(open) => !open && setCustomerForPrices(null)}
        customer={customerForPrices}
      />

      <CustomerProfileDialog
        customer={profileCustomer}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />

      {/* Last Order Details Dialog */}
      <Dialog open={!!lastOrderDialogCustomer} onOpenChange={(open) => { if (!open) { setLastOrderDialogCustomer(null); setLastOrderDetails(null); } }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4 text-primary" />
              {t('customers.last_order')} - {lastOrderDialogCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {loadingLastOrder ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : lastOrderDetails ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{t('customers.date_label')}</p>
                  <p className="font-semibold text-xs">
                    {format(new Date(lastOrderDetails.created_at), 'dd MMM yyyy', { locale: language === 'ar' ? ar : language === 'fr' ? fr : enUS })}
                    {' '}({differenceInDays(new Date(), new Date(lastOrderDetails.created_at))} {t('customers.days')})
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{t('customers.total_amount')}</p>
                  <p className="font-semibold text-xs">
                    {Number(lastOrderDetails.total_amount || 0).toLocaleString()} {t('customers.currency')}
                    {' '}({lastOrderDetails.items?.length || 0} {t('customers.product_count')})
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{t('customers.payment_status')}</p>
                  <p className="font-semibold text-xs">
                    {lastOrderDetails.payment_status === 'cash' ? t('customers.payment_cash') :
                      lastOrderDetails.payment_status === 'credit' ? t('customers.payment_credit') :
                        lastOrderDetails.payment_status === 'check' ? t('customers.payment_check') :
                          lastOrderDetails.payment_status === 'partial' ? t('customers.payment_partial') : t('customers.payment_pending')}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{t('customers.product_count_label')}</p>
                  <p className="font-semibold text-xs">{lastOrderDetails.items?.length || 0}</p>
                </div>
              </div>
              {/* Items */}
              {lastOrderDetails.items && lastOrderDetails.items.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {t('customers.products')}
                  </Label>
                  {lastOrderDetails.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/30 rounded-lg px-2 py-1.5 text-xs">
                      <span className="font-medium">{item.product?.name || t('customers.product')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.quantity} {t('customers.unit')}</span>
                        <span className="font-semibold">{Number(item.total_price || 0).toLocaleString()} {t('customers.currency')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4 text-sm">{t('customers.no_previous_orders_short')}</p>
          )}
        </DialogContent>
      </Dialog>

      <ManageSectorsDialog
        open={showSectorsDialog}
        onOpenChange={setShowSectorsDialog}
      />
      {reviewCustomer && (
        <CustomerChangeReviewDialog
          open={!!reviewCustomer}
          onOpenChange={(open) => { if (!open) setReviewCustomer(null); }}
          customer={reviewCustomer}
          requests={pendingRequestsMap[reviewCustomer.id] || []}
          onProcessed={() => {
            setReviewCustomer(null);
            fetchPendingRequestsPerCustomer();
            fetchRequestsCount();
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default Customers;
