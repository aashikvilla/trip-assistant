-- Enhance expenses system for expense tracker feature
-- Add category and split_between fields to expenses table

-- Add missing fields to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'others',
ADD COLUMN IF NOT EXISTS split_between uuid[] DEFAULT '{}';

-- Create payment records table
CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text,
  date date NOT NULL DEFAULT (now()::date),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_records_different_users CHECK (from_user_id != to_user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_records_trip ON public.payment_records(trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_from_user ON public.payment_records(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_to_user ON public.payment_records(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON public.payment_records(date);

-- Enable RLS on payment_records
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_records
CREATE POLICY "PaymentRecords: select if member"
ON public.payment_records
FOR SELECT
TO authenticated
USING (public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "PaymentRecords: insert if member"
ON public.payment_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_trip_member(auth.uid(), trip_id) AND 
  (from_user_id = auth.uid() OR to_user_id = auth.uid())
);

CREATE POLICY "PaymentRecords: update if creator or trip owner"
ON public.payment_records
FOR UPDATE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id) AND 
  (from_user_id = auth.uid() OR public.is_trip_owner(auth.uid(), trip_id))
)
WITH CHECK (
  public.is_trip_member(auth.uid(), trip_id) AND 
  (from_user_id = auth.uid() OR public.is_trip_owner(auth.uid(), trip_id))
);

CREATE POLICY "PaymentRecords: delete if creator or trip owner"
ON public.payment_records
FOR DELETE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id) AND 
  (from_user_id = auth.uid() OR public.is_trip_owner(auth.uid(), trip_id))
);

-- Update expenses RLS policies to allow all trip members to add/edit expenses
DROP POLICY IF EXISTS "Expenses: insert if member" ON public.expenses;
DROP POLICY IF EXISTS "Expenses: update if editor/owner or payer" ON public.expenses;

CREATE POLICY "Expenses: insert if member"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Expenses: update if member"
ON public.expenses
FOR UPDATE
TO authenticated
USING (public.is_trip_member(auth.uid(), trip_id))
WITH CHECK (public.is_trip_member(auth.uid(), trip_id));

-- Add updated_at trigger for payment_records
DROP TRIGGER IF EXISTS payment_records_set_updated_at ON public.payment_records;
CREATE TRIGGER payment_records_set_updated_at
BEFORE UPDATE ON public.payment_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime for payment_records
ALTER TABLE public.payment_records REPLICA IDENTITY FULL;
