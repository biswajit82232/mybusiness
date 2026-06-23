-- Allow customerDirectory rows in entity_records (client + IndexedDB already sync this type).
-- Without this, upserts fail: new row violates check constraint "entity_records_entity_type_check".

ALTER TABLE public.entity_records
  DROP CONSTRAINT IF EXISTS entity_records_entity_type_check;

ALTER TABLE public.entity_records
  ADD CONSTRAINT entity_records_entity_type_check CHECK (entity_type IN (
    'settings',
    'sales',
    'expenses',
    'recurringExpenses',
    'inventoryEntries',
    'emiEntries',
    'customerDirectory',
    'dismissedAlertIds'
  ));
