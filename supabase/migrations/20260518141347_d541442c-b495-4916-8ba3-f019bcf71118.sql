update public.signage_settings
set
  background_image_url = null,
  background_image_print_url = null,
  background_image_type = 'none',
  background_image_x_position = 50,
  background_image_y_position = 50,
  background_image_opacity = 100,
  updated_at = now()
where id = '11f6731f-2419-4191-9a13-8f7012967132';