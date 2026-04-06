import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types/database';

interface PriceUpdate {
  price_super_gros?: number;
  price_gros?: number;
  price_invoice_official?: number;
  price_invoice?: number;
  price_retail?: number;
  price_no_invoice?: number;
}

interface GroupPriceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProduct: Product;
  groupProducts: Product[];
  groupName: string;
  priceUpdates: PriceUpdate;
  onComplete: () => void;
}

const GroupPriceUpdateDialog: React.FC<GroupPriceUpdateDialogProps> = ({
  open,
  onOpenChange,
  currentProduct,
  groupProducts,
  groupName,
  priceUpdates,
  onComplete,
}) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    groupProducts.map(p => p.id)
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleProduct = (productId: string) => {
    if (productId === currentProduct.id) return; // Can't deselect current product
    
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    } else {
      setSelectedProducts(prev => [...prev, productId]);
    }
  };

  const handleUpdateGroup = async () => {
    if (selectedProducts.length === 0) {
      toast.error('الرجاء اختيار منتج واحد على الأقل');
      return;
    }

    setIsUpdating(true);
    try {
      // Update each product individually to ensure RLS doesn't silently skip
      const updatePromises = selectedProducts.map(id =>
        supabase
          .from('products')
          .update(priceUpdates)
          .eq('id', id)
          .select()
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      const updatedCount = results.filter(r => r.data && r.data.length > 0).length;

      if (errors.length > 0) {
        console.error('Group update errors:', errors.map(r => r.error));
        throw errors[0].error;
      }

      if (updatedCount === 0) {
        toast.error('لم يتم تحديث أي منتج - تحقق من الصلاحيات');
        return;
      }

      if (updatedCount < selectedProducts.length) {
        toast.warning(`تم تحديث ${updatedCount} من ${selectedProducts.length} منتج فقط`);
      } else {
        toast.success(`تم تحديث أسعار ${updatedCount} منتج`);
      }

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating group prices:', error);
      toast.error(error.message || 'فشل تحديث الأسعار');
    } finally {
      setIsUpdating(false);
    }
  };

  const changedPrices = Object.entries(priceUpdates)
    .filter(([_, value]) => value !== undefined)
    .map(([key]) => {
      const labels: Record<string, string> = {
        price_super_gros: 'سعر السبر غرو',
        price_gros: 'سعر الغرو',
        price_invoice: 'سعر الفاتورة',
        price_retail: 'سعر التجزئة',
        price_no_invoice: 'سعر بدون فاتورة',
      };
      return labels[key] || key;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            تحديث مجموعة "{groupName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="text-sm text-muted-foreground">
            <p>سيتم تحديث الأسعار التالية:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {changedPrices.map((price) => (
                <span key={price} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {price}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <p className="text-sm font-medium">
              اختر المنتجات لتحديثها ({selectedProducts.length} من {groupProducts.length}):
            </p>
            <ScrollArea className="flex-1 border rounded-md p-2">
              <div className="space-y-2">
                {groupProducts.map((product) => (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      product.id === currentProduct.id 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                      disabled={product.id === currentProduct.id}
                    />
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1">{(product as any).app_name || product.name}</span>
                    {product.id === currentProduct.id && (
                      <span className="text-xs text-primary">(الحالي)</span>
                    )}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleUpdateGroup} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              `تحديث ${selectedProducts.length} منتج`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupPriceUpdateDialog;
