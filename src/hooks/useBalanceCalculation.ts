import { useQuery } from '@tanstack/react-query';
import { useExpenses, type Expense } from './useExpenses';
import { usePaymentRecords, type PaymentRecord } from './usePaymentRecords';
import { useTripMembers, type TripMember } from './useTripMembers';

export interface IndividualBalance {
  with_user_id: string;
  with_user_name: string;
  amount: number; // positive = they owe you, negative = you owe them
}

export interface UserBalance {
  user_id: string;
  user_name: string;
  net_balance: number; // positive = total owed to you, negative = total you owe
  individual_balances: IndividualBalance[];
}

export const useBalanceCalculation = (tripId: string, currentUserId?: string) => {
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: paymentRecords = [] } = usePaymentRecords(tripId);
  const { data: tripMembers = [] } = useTripMembers(tripId);

  // Build lightweight signatures so the query recomputes when data changes
  const expensesSig = expenses.map(e => `${e.id}:${e.updated_at}:${e.amount}`).join('|');
  const paymentsSig = paymentRecords.map(p => `${p.id}:${p.updated_at}:${p.amount}`).join('|');

  return useQuery({
    queryKey: ['balances', tripId, currentUserId, expensesSig, paymentsSig],
    queryFn: (): UserBalance | null => {
      if (!currentUserId) return null;

      // Create a map of user IDs to names
      const userMap = new Map<string, string>();
      tripMembers.forEach((member: TripMember) => {
        const name = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown User';
        userMap.set(member.profile_id, name);
      });

      // Calculate balances between all users
      const balances = new Map<string, Map<string, number>>();

      // Initialize balance maps for all users
      tripMembers.forEach((member: TripMember) => {
        balances.set(member.profile_id, new Map());
      });

      // Process expenses
      expenses.forEach((expense: Expense) => {
        const paidBy = expense.paid_by;
        const splitBetween = expense.split_between;
        const shareAmount = expense.amount / splitBetween.length;

        splitBetween.forEach(participantId => {
          if (participantId !== paidBy) {
            // This participant owes the payer
            const paidByBalances = balances.get(paidBy) || new Map();
            const currentBalance = paidByBalances.get(participantId) || 0;
            paidByBalances.set(participantId, currentBalance + shareAmount);
            balances.set(paidBy, paidByBalances);

            // Update the participant's balance (they owe the payer)
            const participantBalances = balances.get(participantId) || new Map();
            const currentParticipantBalance = participantBalances.get(paidBy) || 0;
            participantBalances.set(paidBy, currentParticipantBalance - shareAmount);
            balances.set(participantId, participantBalances);
          }
        });
      });

      // Process payment records
      paymentRecords.forEach((payment: PaymentRecord) => {
        const fromUserId = payment.from_user_id;
        const toUserId = payment.to_user_id;
        const amount = payment.amount;

        // From user paid to user, so reduce what from user owes to user
        const fromUserBalances = balances.get(fromUserId) || new Map();
        const currentFromBalance = fromUserBalances.get(toUserId) || 0;
        fromUserBalances.set(toUserId, currentFromBalance + amount);
        balances.set(fromUserId, fromUserBalances);

        // To user received from from user
        const toUserBalances = balances.get(toUserId) || new Map();
        const currentToBalance = toUserBalances.get(fromUserId) || 0;
        toUserBalances.set(fromUserId, currentToBalance - amount);
        balances.set(toUserId, toUserBalances);
      });

      // Calculate current user's balance
      const currentUserBalances = balances.get(currentUserId) || new Map();
      const individualBalances: IndividualBalance[] = [];
      let netBalance = 0;

      currentUserBalances.forEach((amount, otherUserId) => {
        if (Math.abs(amount) > 0.01) { // Only show non-zero balances
          individualBalances.push({
            with_user_id: otherUserId,
            with_user_name: userMap.get(otherUserId) || 'Unknown User',
            amount: amount,
          });
          netBalance += amount;
        }
      });

      const currentUserBalance: UserBalance = {
        user_id: currentUserId,
        user_name: userMap.get(currentUserId) || 'You',
        net_balance: netBalance,
        individual_balances: individualBalances,
      };

      return currentUserBalance;
    },
    enabled: !!tripId && !!currentUserId && tripMembers.length > 0,
  });
};
