import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateExpense, useUpdateExpense, type Expense } from '@/hooks/useExpenses';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BillScanButton } from './BillScanButton';
import type { ExtractedExpenseData } from '@/hooks/useBillScan';

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  expense?: Expense | null;
}

const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'travel', label: 'Travel & Transport' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities', label: 'Activities & Entertainment' },
  { value: 'others', label: 'Others' },
] as const;

export const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  expense,
}) => {
  const { user } = useAuth();
  const { data: tripMembers = [] } = useTripMembers(tripId);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [formData, setFormData] = useState({
    amount: expense?.amount?.toString() || '',
    description: expense?.description || '',
    category: expense?.category || 'others',
    date: expense?.date || new Date().toISOString().split('T')[0],
    paid_by: expense?.paid_by || user?.id || '',
    split_between: expense?.split_between || tripMembers.map(m => m.profile_id),
  });

  const isEditing = !!expense;
  const isLoading = createExpense.isPending || updateExpense.isPending;
  const [isScanning, setIsScanning] = useState(false);

  const VALID_CATEGORIES = ['food', 'travel', 'accommodation', 'activities', 'others'] as const;

  const handleScanExtracted = (data: ExtractedExpenseData) => {
    setFormData(prev => ({
      ...prev,
      amount: data.amount != null ? data.amount.toString() : prev.amount,
      description: data.description ?? prev.description,
      date: data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : prev.date,
      category: (VALID_CATEGORIES as readonly string[]).includes(data.category as string)
        ? (data.category as typeof prev.category)
        : prev.category,
    }));
    toast.success('Bill scanned — fields have been pre-filled. Review before submitting.');
  };

  const handleScanError = (message: string) => {
    toast.error(message);
  };

  // Keep defaults/prefill in sync when dialog opens, user or members load, or editing item changes
  useEffect(() => {
    if (!open) return;
    const defaultPaidBy = expense?.paid_by || user?.id || '';
    const defaultSplitBetween = expense?.split_between && expense.split_between.length > 0
      ? expense.split_between
      : tripMembers.map(m => m.profile_id);
    setFormData(prev => ({
      amount: expense?.amount?.toString() || prev.amount || '',
      description: expense?.description || prev.description || '',
      category: (expense?.category as any) || (prev.category as any) || 'others',
      date: expense?.date || prev.date || new Date().toISOString().split('T')[0],
      paid_by: defaultPaidBy,
      split_between: defaultSplitBetween,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, tripMembers.length, expense?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.description || !formData.paid_by || formData.split_between.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const expenseData = {
        trip_id: tripId,
        amount,
        description: formData.description,
        category: formData.category as 'food' | 'travel' | 'accommodation' | 'activities' | 'others',
        date: formData.date,
        paid_by: formData.paid_by,
        split_between: formData.split_between,
      };

      if (isEditing) {
        await updateExpense.mutateAsync({
          id: expense.id,
          ...expenseData,
        });
        toast.success('Expense updated successfully');
      } else {
        await createExpense.mutateAsync(expenseData);
        toast.success('Expense added successfully');
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update expense' : 'Failed to add expense');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      category: 'others',
      date: new Date().toISOString().split('T')[0],
      paid_by: user?.id || '',
      split_between: tripMembers.map(m => m.profile_id),
    });
  };

  const handleSplitBetweenChange = (memberId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      split_between: checked
        ? [...prev.split_between, memberId]
        : prev.split_between.filter(id => id !== memberId),
    }));
  };

  const selectAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      split_between: tripMembers.map(m => m.profile_id),
    }));
  };

  const deselectAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      split_between: [],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scan Bill */}
          {!isEditing && (
            <BillScanButton
              onExtracted={handleScanExtracted}
              onError={handleScanError}
              onScanningChange={setIsScanning}
              disabled={isLoading}
            />
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          {/* Description with suggestions */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              list="expense-descriptions"
              placeholder="e.g., Dinner, Taxi, Entry tickets"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
            <datalist id="expense-descriptions">
              <option value="Breakfast" />
              <option value="Lunch" />
              <option value="Dinner" />
              <option value="Snacks" />
              <option value="Drinks" />
              <option value="Taxi" />
              <option value="Fuel" />
              <option value="Tolls" />
              <option value="Parking" />
              <option value="Tickets" />
              <option value="Entry fee" />
              <option value="Hotel" />
              <option value="Airbnb" />
              <option value="Shopping" />
              <option value="Others" />
            </datalist>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: 'food' | 'travel' | 'accommodation' | 'activities' | 'others') => 
                setFormData(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label htmlFor="paid_by">Paid By *</Label>
            <Select
              value={formData.paid_by}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paid_by: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Who paid?" />
              </SelectTrigger>
              <SelectContent>
                {tripMembers.map((member) => (
                  <SelectItem key={member.profile_id} value={member.profile_id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Between */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Split Between *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllMembers}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllMembers}
                >
                  None
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {tripMembers.map((member) => (
                <div key={member.profile_id} className="flex items-center space-x-2">
                  <Checkbox
                    id={member.profile_id}
                    checked={formData.split_between.includes(member.profile_id)}
                    onCheckedChange={(checked) =>
                      handleSplitBetweenChange(member.profile_id, checked as boolean)
                    }
                  />
                  <Label htmlFor={member.profile_id} className="text-sm">
                    {member.first_name} {member.last_name}
                  </Label>
                </div>
              ))}
            </div>
            {formData.split_between.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ${(parseFloat(formData.amount) / formData.split_between.length || 0).toFixed(2)} per person
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isScanning}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
