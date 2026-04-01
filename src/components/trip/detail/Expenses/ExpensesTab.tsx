import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Receipt, CreditCard } from 'lucide-react';
import { TabContent } from '../Common/TabContent';
import { BalanceOverview } from './BalanceOverview';
import { ExpensesList } from './ExpensesList';
import { AddExpenseDialog } from './AddExpenseDialog';
import { AddPaymentDialog } from './AddPaymentDialog';
import { type Expense } from '@/hooks/useExpenses';
import { type PaymentRecord } from '@/hooks/usePaymentRecords';
import { useAuth } from '@/hooks/useAuth';
import { useBalanceCalculation } from '@/hooks/useBalanceCalculation';

interface ExpensesTabProps {
  tripId: string;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ tripId }) => {
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [paymentPrefill, setPaymentPrefill] = useState<{
    from_user_id?: string;
    to_user_id?: string;
    amount?: number;
    description?: string;
    date?: string;
  } | null>(null);

  const { user } = useAuth();
  const { isFetching: isCalculating } = useBalanceCalculation(tripId, user?.id) as any;

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseDialog(true);
  };

  const handleEditPayment = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setShowPaymentDialog(true);
  };

  const handleCloseExpenseDialog = () => {
    setShowExpenseDialog(false);
    setEditingExpense(null);
  };

  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
    setEditingPayment(null);
    setPaymentPrefill(null);
  };

  const handleSettle = (prefill: { from_user_id: string; to_user_id: string; amount: number; description: string; date?: string }) => {
    setPaymentPrefill(prefill);
    setEditingPayment(null);
    setShowPaymentDialog(true);
  };

  return (
    <>
      <TabContent
        title="Expenses"
        description="Track trip expenses and split costs with your group"
        action={
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {isCalculating && (
              <span className="text-xs text-muted-foreground sm:mr-2">Updating balances...</span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowPaymentDialog(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setShowExpenseDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        }
        className="space-y-6"
      >
        {/* Balance Overview */}
        <BalanceOverview tripId={tripId} onSettle={handleSettle} />

        {/* Expenses List */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5" />
            <h3 className="text-lg font-semibold">All Transactions</h3>
          </div>
          <ExpensesList
            tripId={tripId}
            onEditExpense={handleEditExpense}
            onEditPayment={handleEditPayment}
          />
        </div>
      </TabContent>

      {/* Dialogs */}
      <AddExpenseDialog
        open={showExpenseDialog}
        onOpenChange={handleCloseExpenseDialog}
        tripId={tripId}
        expense={editingExpense}
      />

      <AddPaymentDialog
        open={showPaymentDialog}
        onOpenChange={handleClosePaymentDialog}
        tripId={tripId}
        payment={editingPayment}
        prefill={paymentPrefill || undefined}
      />
    </>
  );
};
