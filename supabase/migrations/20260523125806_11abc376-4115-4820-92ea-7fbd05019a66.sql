update public.running_sheets
   set section_label = 'Run Sheet'
 where lower(trim(section_label)) = 'running sheet';