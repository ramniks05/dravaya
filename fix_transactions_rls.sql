-- Fix RLS policies for transactions table
-- Run this in Supabase SQL Editor

-- Add INSERT policy for vendors
drop policy if exists transactions_insert_vendor on public.transactions;
create policy transactions_insert_vendor on public.transactions
for insert with check (auth.uid() = vendor_id);

-- Add UPDATE policy for admins
drop policy if exists transactions_update_admin on public.transactions;
create policy transactions_update_admin on public.transactions
for update using (public.is_admin(auth.uid()));

-- Allow service role to update transactions (for webhooks)
drop policy if exists transactions_update_service_role on public.transactions;
create policy transactions_update_service_role on public.transactions
for update using (current_setting('role') = 'service_role');

