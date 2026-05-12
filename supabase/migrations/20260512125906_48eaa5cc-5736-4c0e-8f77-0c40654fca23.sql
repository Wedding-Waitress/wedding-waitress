INSERT INTO public.signage_categories (name, slug) VALUES
  ('Asian','asian'),('Baby Shower','baby-shower'),('Birthday','birthday'),
  ('Celebrations','celebrations'),('Chinese','chinese'),('Christmas','christmas'),
  ('Cultural','cultural'),('Elegant','elegant'),('Floral','floral'),
  ('Glamour','glamour'),('Islamic','islamic'),('Kids','kids'),
  ('Minimal','minimal'),('Religious','religious'),('Tropical','tropical'),
  ('Vintage','vintage'),('Wedding','wedding'),('Uncategorized','uncategorized')
ON CONFLICT (name) DO NOTHING;