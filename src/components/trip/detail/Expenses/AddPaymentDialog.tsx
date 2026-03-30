import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePaymentRecord, useUpdatePaymentRecord, type PaymentRecord } from '@/hooks/usePaymentRecords';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  payment?: PaymentRecord | null;
  prefill?: {
    from_user_id?: string;
    to_user_id?: string;
    amount?: number;
    description?: string;
    date?: string;
  } | null;
}

export const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  payment,
  prefill,
}) => {
  const { user } = useAuth();
  const { data: tripMembers = [] } = useTripMembers(tripId);
  const createPaymentRecord = useCreatePaymentRecord();
  const updatePaymentRecord = useUpdatePaymentRecord();

  const [formData, setFormData] = useState({
    amount: payment?.amount?.toString() || prefill?.amount?.toString() || '',
    description: payment?.description || prefill?.description || '',
    date: payment?.date || prefill?.date || new Date().toISOString().split('T')[0],
    from_user_id: payment?.from_user_id || prefill?.from_user_id || user?.id || '',
    to_user_id: payment?.to_user_id || prefill?.to_user_id || '',
  });

  const isEditing = !!payment;
  const isLoading = createPaymentRecord.isPending || updatePaymentRecord.isPending;

  // When dialog opens or inputs change, refresh the form with latest prefill/defaults
  useEffect(() => {
    if (!open) return;
    setFormData({
      amount: payment?.amount?.toString() || prefill?.amount?.toString() || '',
      description: payment?.description || prefill?.description || '',
      date: payment?.date || prefill?.date || new Date().toISOString().split('T')[0],
      from_user_id: payment?.from_user_id || prefill?.from_user_id || user?.id || '',
      to_user_id: payment?.to_user_id || prefill?.to_user_id || '',
    });
  }, [open, payment, prefill, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.from_user_id || !formData.to_user_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.from_user_id === formData.to_user_id) {
      toast.error('From and To users must be different');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const paymentData = {
        trip_id: tripId,
        amount,
        description: formData.description || undefined,
        date: formData.date,
        from_user_id: formData.from_user_id,
        to_user_id: formData.to_user_id,
      };

      if (isEditing) {
        await updatePaymentRecord.mutateAsync({
          id: payment.id,
          ...paymentData,
        });
        toast.success('Payment record updated successfully');
      } else {
        await createPaymentRecord.mutateAsync(paymentData);
        toast.success('Payment record added successfully');
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update payment record' : 'Failed to add payment record');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      from_user_id: user?.id || '',
      to_user_id: '',
    });
  };

  // Filter out the selected from_user from the to_user options
  const availableToUsers = tripMembers.filter(member => member.profile_id !== formData.from_user_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment Record' : 'Record Payment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* From User */}
          <div className="space-y-2">
            <Label htmlFor="from_user">From (Who Paid) *</Label>
            <Select
              value={formData.from_user_id}
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  from_user_id: value,
                  // Reset to_user if it's the same as from_user
                  to_user_id: prev.to_user_id === value ? '' : prev.to_user_id
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Who made the payment?" />
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

          {/* To User */}
          <div className="space-y-2">
            <Label htmlFor="to_user">To (Who Received) *</Label>
            <Select
              value={formData.to_user_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, to_user_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Who received the payment?" />
              </SelectTrigger>
              <SelectContent>
                {availableToUsers.map((member) => (
                  <SelectItem key={member.profile_id} value={member.profile_id}>
                    {member.first_name} {member.last_name}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this payment..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
