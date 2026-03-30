import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses, useDeleteExpense, type Expense } from '@/hooks/useExpenses';
import { usePaymentRecords, useDeletePaymentRecord, type PaymentRecord } from '@/hooks/usePaymentRecords';
import { useTripMembers } from '@/hooks/useTripMembers';
import { 
  DollarSign, 
  ArrowRightLeft, 
  Calendar, 
  Users, 
  MoreVertical,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ExpensesListProps {
  tripId: string;
  onEditExpense: (expense: Expense) => void;
  onEditPayment: (payment: PaymentRecord) => void;
}

type TransactionItem = 
  | ({ type: 'expense' } & Expense)
  | ({ type: 'payment' } & PaymentRecord);

const CATEGORY_LABELS = {
  food: 'Food & Dining',
  travel: 'Travel & Transport',
  accommodation: 'Accommodation',
  activities: 'Activities & Entertainment',
  others: 'Others',
} as const;

const CATEGORY_COLORS = {
  food: 'bg-orange-100 text-orange-800',
  travel: 'bg-blue-100 text-blue-800',
  accommodation: 'bg-purple-100 text-purple-800',
  activities: 'bg-green-100 text-green-800',
  others: 'bg-gray-100 text-gray-800',
} as const;

export const ExpensesList: React.FC<ExpensesListProps> = ({
  tripId,
  onEditExpense,
  onEditPayment,
}) => {
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: paymentRecords = [] } = usePaymentRecords(tripId);
  const { data: tripMembers = [] } = useTripMembers(tripId);
  const deleteExpense = useDeleteExpense();
  const deletePaymentRecord = useDeletePaymentRecord();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Create a map of user IDs to names
  const userMap = new Map<string, string>();
  tripMembers.forEach(member => {
    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown User';
    userMap.set(member.profile_id, name);
  });

  // Combine and sort transactions
  const allTransactions: TransactionItem[] = [
    ...expenses.map(expense => ({ ...expense, type: 'expense' as const })),
    ...paymentRecords.map(payment => ({ ...payment, type: 'payment' as const })),
  ].sort((a, b) => {
    const dateA = a.type === 'expense' ? a.date : a.date;
    const dateB = b.type === 'expense' ? b.date : b.date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Filter transactions by category
  const filteredTransactions = allTransactions.filter(transaction => {
    if (categoryFilter === 'all') return true;
    if (transaction.type === 'payment') return categoryFilter === 'payments';
    return transaction.category === categoryFilter;
  });

  const handleDeleteExpense = async (expense: Expense) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense.mutateAsync({ id: expense.id, tripId });
        toast.success('Expense deleted successfully');
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await deletePaymentRecord.mutateAsync({ id: payment.id, tripId });
        toast.success('Payment record deleted successfully');
      } catch (error) {
        toast.error('Failed to delete payment record');
      }
    }
  };

  if (filteredTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
          <p className="text-muted-foreground text-sm">
            Start by adding an expense or recording a payment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="payments">Payment Records</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.map((transaction) => (
          <Card key={`${transaction.type}-${transaction.id}`} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icon */}
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'expense' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {transaction.type === 'expense' ? (
                      <DollarSign className="h-4 w-4" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">
                        {transaction.type === 'expense' 
                          ? transaction.description 
                          : `Payment: ${userMap.get(transaction.from_user_id)} → ${userMap.get(transaction.to_user_id)}`
                        }
                      </h4>
                      {transaction.type === 'expense' && (
                        <Badge 
                          variant="secondary" 
                          className={CATEGORY_COLORS[transaction.category]}
                        >
                          {CATEGORY_LABELS[transaction.category]}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(transaction.type === 'expense' ? transaction.date : transaction.date), 'MMM d, yyyy')}
                      </div>
                      
                      {transaction.type === 'expense' ? (
                        <>
                          <span>Paid by {userMap.get(transaction.paid_by)}</span>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>Split {transaction.split_between.length} ways</span>
                          </div>
                        </>
                      ) : (
                        transaction.description && (
                          <span className="truncate">{transaction.description}</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      ${transaction.amount.toFixed(2)}
                    </div>
                    {transaction.type === 'expense' && transaction.split_between.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        ${(transaction.amount / transaction.split_between.length).toFixed(2)} per person
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        if (transaction.type === 'expense') {
                          onEditExpense(transaction);
                        } else {
                          onEditPayment(transaction);
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (transaction.type === 'expense') {
                          handleDeleteExpense(transaction);
                        } else {
                          handleDeletePayment(transaction);
                        }
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
