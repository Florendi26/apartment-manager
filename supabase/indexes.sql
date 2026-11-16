-- Optional performance indexes for filters the app already uses.
-- Run this in the Supabase SQL editor. It does not add or rename columns.
-- Each statement is independent; skip any index that already exists.

create index if not exists apartments_landlord_id_idx
  on public.apartments (landlord_id);

create index if not exists apartments_rental_status_idx
  on public.apartments (rental_status);

create index if not exists contracts_apartment_id_idx
  on public.contracts (apartment_id);

create index if not exists contracts_tenant_id_idx
  on public.contracts (tenant_id);

create index if not exists contracts_apartment_active_idx
  on public.contracts (apartment_id, is_active);

create index if not exists tenants_email_idx
  on public.tenants (email);

create index if not exists tenants_user_id_idx
  on public.tenants (user_id);

create index if not exists landlords_user_id_idx
  on public.landlords (user_id);

create index if not exists apartment_requests_apartment_id_idx
  on public.apartment_requests (apartment_id);

create index if not exists apartment_requests_tenant_id_idx
  on public.apartment_requests (tenant_id);

create index if not exists payment_requests_contract_id_idx
  on public.payment_requests (contract_id);

create index if not exists rent_bills_contract_id_idx on public.rent_bills (contract_id);
create index if not exists garbage_bills_contract_id_idx on public.garbage_bills (contract_id);
create index if not exists maintenance_bills_contract_id_idx on public.maintenance_bills (contract_id);
create index if not exists electricity_bills_contract_id_idx on public.electricity_bills (contract_id);
create index if not exists water_bills_contract_id_idx on public.water_bills (contract_id);
create index if not exists heating_bills_contract_id_idx on public.heating_bills (contract_id);

create index if not exists rent_payments_contract_id_idx on public.rent_payments (contract_id);
create index if not exists garbage_payments_contract_id_idx on public.garbage_payments (contract_id);
create index if not exists maintenance_payments_contract_id_idx on public.maintenance_payments (contract_id);
create index if not exists electricity_payments_contract_id_idx on public.electricity_payments (contract_id);
create index if not exists water_payments_contract_id_idx on public.water_payments (contract_id);
create index if not exists heating_payments_contract_id_idx on public.heating_payments (contract_id);

create index if not exists rent_payments_bill_id_idx on public.rent_payments (bill_id);
create index if not exists garbage_payments_bill_id_idx on public.garbage_payments (bill_id);
create index if not exists maintenance_payments_bill_id_idx on public.maintenance_payments (bill_id);
create index if not exists electricity_payments_bill_id_idx on public.electricity_payments (bill_id);
create index if not exists water_payments_bill_id_idx on public.water_payments (bill_id);
create index if not exists heating_payments_bill_id_idx on public.heating_payments (bill_id);
