-- Keep shared Reset to Default aligned with the original column layout.
DO $fix$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.reset_dj_mc_section_by_token(text,uuid,text,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'SET section_label = p_default_label, notes = NULL','SET custom_columns = NULL, section_label = p_default_label, notes = NULL');
 EXECUTE definition;
END $fix$;
