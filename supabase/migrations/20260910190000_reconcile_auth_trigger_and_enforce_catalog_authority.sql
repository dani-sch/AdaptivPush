-- AP-01.3 catalog authority boundary and cross-schema trigger reconciliation.
--
-- The production baseline is intentionally limited to the public schema. The
-- auth.users trigger therefore has to be represented explicitly so a fresh
-- environment retains the production signup behavior.

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
ALTER FUNCTION public.handle_new_user() SET search_path = '';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS exercises_insert ON public.exercises;
DROP POLICY IF EXISTS exercises_update ON public.exercises;
DROP POLICY IF EXISTS exercises_delete ON public.exercises;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON TABLE public.exercises
  FROM anon, authenticated;

-- Catalog reads remain available to ordinary clients. Trusted catalog
-- curation continues through postgres/service_role, which retain their
-- existing table authority; service_role also retains BYPASSRLS.
GRANT SELECT ON TABLE public.exercises TO anon, authenticated;
