## Sync Seating Chart Sign Gallery Categories

Insert any missing categories into the `signage_categories` table so it matches the Invitation Image Gallery list. No code, UI, or existing data changes.

### Categories to ensure exist
Asian, Baby Shower, Birthday, Celebrations, Chinese, Christmas, Cultural, Elegant, Floral, Glamour, Islamic, Kids, Minimal, Religious, Tropical, Vintage, Wedding, Uncategorized.

### Approach
Run a single idempotent SQL insert against `signage_categories`:

```sql
INSERT INTO public.signage_categories (name, slug)
VALUES
  ('Asian','asian'), ('Baby Shower','baby-shower'), ('Birthday','birthday'),
  ('Celebrations','celebrations'), ('Chinese','chinese'), ('Christmas','christmas'),
  ('Cultural','cultural'), ('Elegant','elegant'), ('Floral','floral'),
  ('Glamour','glamour'), ('Islamic','islamic'), ('Kids','kids'),
  ('Minimal','minimal'), ('Religious','religious'), ('Tropical','tropical'),
  ('Vintage','vintage'), ('Wedding','wedding'), ('Uncategorized','uncategorized')
ON CONFLICT (name) DO NOTHING;
```

### Guarantees
- Existing categories untouched (ON CONFLICT DO NOTHING).
- No image rows touched — no reclassification, no moves.
- No changes to dropdown UI, counts, filtering, admin categorize flow, styling, modal, or single-category enforcement.
- No changes to invitation gallery or any other page.

### Verification
After insert, `SELECT name FROM signage_categories ORDER BY name` should include all 18 names above (plus any pre-existing extras, which remain untouched).
