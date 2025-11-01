-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
do $$ begin
  create type user_role as enum ('vendor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_status as enum ('pending', 'failed', 'processing', 'success', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_mode as enum ('UPI', 'IMPS', 'NEFT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallet_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- Tables
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role user_role not null default 'vendor',
  status user_status not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  balance numeric(15,2) not null default 0.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.beneficiaries (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  phone_number text not null,
  vpa_address text,
  account_number text,
  ifsc text,
  bank_name text,
  preferred_mode payment_mode not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  beneficiary_id uuid references public.beneficiaries(id) on delete set null,
  merchant_reference_id text unique not null,
  amount numeric(15,2) not null,
  mode payment_mode not null,
  status transaction_status not null default 'pending',
  utr text,
  narration text,
  encryption_key text not null,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wallet_requests (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  amount numeric(15,2) not null,
  status wallet_request_status not null default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid references public.users(id) on delete set null
);

-- Indexes
create index if not exists idx_transactions_vendor_id on public.transactions(vendor_id);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_merchant_ref on public.transactions(merchant_reference_id);
create index if not exists idx_beneficiaries_vendor_id on public.beneficiaries(vendor_id);
create index if not exists idx_wallet_requests_vendor_id on public.wallet_requests(vendor_id);
create index if not exists idx_wallet_requests_status on public.wallet_requests(status);

-- Utility: updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists update_wallets_updated_at on public.wallets;
create trigger update_wallets_updated_at before update on public.wallets
for each row execute function public.update_updated_at_column();

drop trigger if exists update_beneficiaries_updated_at on public.beneficiaries;
create trigger update_beneficiaries_updated_at before update on public.beneficiaries
for each row execute function public.update_updated_at_column();

drop trigger if exists update_transactions_updated_at on public.transactions;
create trigger update_transactions_updated_at before update on public.transactions
for each row execute function public.update_updated_at_column();

drop trigger if exists update_wallet_requests_updated_at on public.wallet_requests;
create trigger update_wallet_requests_updated_at before update on public.wallet_requests
for each row execute function public.update_updated_at_column();

-- Auto create wallet on user creation
create or replace function public.create_wallet_for_user()
returns trigger as $$
begin
  insert into public.wallets (user_id, balance) values (new.id, 0.00)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists create_wallet_on_user_creation on public.users;
create trigger create_wallet_on_user_creation
after insert on public.users
for each row execute function public.create_wallet_for_user();

-- RLS helper to detect admin
create or replace function public.is_admin(uid uuid)
returns boolean as $$
  select exists(
    select 1 from public.users u where u.id = uid and u.role = 'admin'
  );
$$ language sql stable;

-- Enable RLS
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.transactions enable row level security;
alter table public.wallet_requests enable row level security;

-- Users policies
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select using (auth.uid() = id);

drop policy if exists users_select_admin on public.users;
create policy users_select_admin on public.users
for select using (public.is_admin(auth.uid()));

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
for insert with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update using (auth.uid() = id);

-- Wallets policies
drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets
for select using (auth.uid() = user_id);

drop policy if exists wallets_select_admin on public.wallets;
create policy wallets_select_admin on public.wallets
for select using (public.is_admin(auth.uid()));

-- Beneficiaries policies
drop policy if exists beneficiaries_all_vendor on public.beneficiaries;
create policy beneficiaries_all_vendor on public.beneficiaries
for all using (auth.uid() = vendor_id)
with check (auth.uid() = vendor_id);

-- Transactions policies
drop policy if exists transactions_select_vendor on public.transactions;
create policy transactions_select_vendor on public.transactions
for select using (auth.uid() = vendor_id);

drop policy if exists transactions_select_admin on public.transactions;
create policy transactions_select_admin on public.transactions
for select using (public.is_admin(auth.uid()));

-- Wallet requests policies
drop policy if exists wallet_requests_all_vendor on public.wallet_requests;
create policy wallet_requests_all_vendor on public.wallet_requests
for all using (auth.uid() = vendor_id)
with check (auth.uid() = vendor_id);

drop policy if exists wallet_requests_select_admin on public.wallet_requests;
create policy wallet_requests_select_admin on public.wallet_requests
for select using (public.is_admin(auth.uid()));

drop policy if exists wallet_requests_update_admin on public.wallet_requests;
create policy wallet_requests_update_admin on public.wallet_requests
for update using (public.is_admin(auth.uid()));

-- Wallet request approval: add funds when status changes to approved
create or replace function public.apply_wallet_request()
returns trigger as $$
begin
  -- When moving to approved (on insert with approved or update to approved)
  if (tg_op = 'INSERT' and new.status = 'approved') or 
     (tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved') then
    update public.wallets
    set balance = balance + new.amount
    where user_id = new.vendor_id;

    new.processed_at = coalesce(new.processed_at, now());
    if new.processed_by is null then
      new.processed_by = auth.uid();
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_wallet_request_apply_ins on public.wallet_requests;
create trigger trg_wallet_request_apply_ins
before insert on public.wallet_requests
for each row execute function public.apply_wallet_request();

drop trigger if exists trg_wallet_request_apply_upd on public.wallet_requests;
create trigger trg_wallet_request_apply_upd
before update on public.wallet_requests
for each row execute function public.apply_wallet_request();

-- Transaction balance processing (deduct on pending, refund on fail/reversed)
create or replace function public.process_transaction_balance()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('pending','processing') then
      update public.wallets
      set balance = balance - new.amount
      where user_id = new.vendor_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if (new.status in ('failed','reversed')) and (old.status in ('pending','processing')) then
      update public.wallets
      set balance = balance + new.amount
      where user_id = new.vendor_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_transactions_balance_ins on public.transactions;
create trigger trg_transactions_balance_ins
after insert on public.transactions
for each row execute function public.process_transaction_balance();

drop trigger if exists trg_transactions_balance_upd on public.transactions;
create trigger trg_transactions_balance_upd
after update on public.transactions
for each row execute function public.process_transaction_balance();


