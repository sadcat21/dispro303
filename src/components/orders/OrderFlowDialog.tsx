import React from 'react';
import { useOrderItems } from '@/hooks/useOrders';
import { OrderWithDetails, OrderItem, Product } from '@/types/database';
import CreateOrderDialog from '@/components/orders/CreateOrderDialog';
import ModifyOrderDialog from '@/components/orders/ModifyOrderDialog';
import OrderDetailsDialog from '@/components/orders/OrderDetailsDialog';

export type OrderDialogMode = 'create' | 'edit' | 'details';

interface OrderFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: OrderDialogMode;
  order?: OrderWithDetails | null;
  initialCustomerId?: string;
}

const OrderFlowDialog: React.FC<OrderFlowDialogProps> = ({
  open,
  onOpenChange,
  mode,
  order = null,
  initialCustomerId,
}) => {
  const { data: orderItems = [] } = useOrderItems(order?.id ?? null);

  if (mode === 'create') {
    return (
      <CreateOrderDialog
        open={open}
        onOpenChange={onOpenChange}
        initialCustomerId={initialCustomerId}
      />
    );
  }

  if (mode === 'edit' && order) {
    return (
      <ModifyOrderDialog
        open={open}
        onOpenChange={onOpenChange}
        order={order}
        orderItems={orderItems as (OrderItem & { product?: Product })[]}
      />
    );
  }

  if (mode === 'details') {
    return (
      <OrderDetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        order={order}
      />
    );
  }

  return null;
};

export default OrderFlowDialog;
