import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Wave 2 (one migration for every concern's schema request):
 *
 * - `requests.kind` gains `personal_data`: a rights request from /maxfiylik
 *   (CMS-SPEC §13.3) with its own 14-day deadline, instead of `other`;
 * - `articles.secondRead.escalatedAt`: the worker marks an overdue second read
 *   once, so a restart never escalates it to the editor-in-chief again (§5.4);
 * - `articles.sponsored.returnPhraseOverride` and its reason: the
 *   editor-in-chief's SP-5 override (§5.9);
 * - `audit_truncate_ips(days)`: the 90-day IP truncation of the audit log
 *   (§9.5, §13.1). The app role has no UPDATE on `audit_log`, so the nightly
 *   job calls this owner-defined function, which can only replace a stored
 *   address by its network (/24, /48) on rows older than 90 days.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_requests_kind" ADD VALUE 'personal_data' BEFORE 'other';
  ALTER TABLE "articles" ADD COLUMN "second_read_escalated_at" timestamp(3) with time zone;
  ALTER TABLE "articles" ADD COLUMN "sponsored_return_phrase_override" boolean;
  ALTER TABLE "articles" ADD COLUMN "sponsored_return_phrase_override_reason" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_second_read_escalated_at" timestamp(3) with time zone;
  ALTER TABLE "_articles_v" ADD COLUMN "version_sponsored_return_phrase_override" boolean;
  ALTER TABLE "_articles_v" ADD COLUMN "version_sponsored_return_phrase_override_reason" varchar;`)

  await db.execute(sql`
CREATE OR REPLACE FUNCTION public.audit_truncate_ips(older_than_days integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id, ip FROM audit_log
           WHERE at < now() - make_interval(days => greatest(older_than_days, 90))
             AND ip IS NOT NULL AND position('/' in ip) = 0 LOOP
    BEGIN
      UPDATE audit_log SET ip = network(set_masklen(r.ip::inet, CASE WHEN family(r.ip::inet) = 4 THEN 24 ELSE 48 END))::text WHERE id = r.id;
      n := n + 1;
    EXCEPTION WHEN invalid_text_representation THEN NULL;  -- e.g. 'local': left as stored (it is hashed as-is)
    END;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.audit_truncate_ips(integer) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'muomalat_app') THEN
    GRANT EXECUTE ON FUNCTION public.audit_truncate_ips(integer) TO muomalat_app;
  END IF;
END
$$;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP FUNCTION IF EXISTS public.audit_truncate_ips(integer);`)
  await db.execute(sql`
   ALTER TABLE "requests" ALTER COLUMN "kind" SET DATA TYPE text;
  UPDATE "requests" SET "kind" = 'other' WHERE "kind" = 'personal_data';
  ALTER TABLE "requests" ALTER COLUMN "kind" SET DEFAULT 'error_report'::text;
  DROP TYPE "public"."enum_requests_kind";
  CREATE TYPE "public"."enum_requests_kind" AS ENUM('error_report', 'refutation', 'reply', 'removal', 'other');
  ALTER TABLE "requests" ALTER COLUMN "kind" SET DEFAULT 'error_report'::"public"."enum_requests_kind";
  ALTER TABLE "requests" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_requests_kind" USING "kind"::"public"."enum_requests_kind";
  ALTER TABLE "articles" DROP COLUMN "second_read_escalated_at";
  ALTER TABLE "articles" DROP COLUMN "sponsored_return_phrase_override";
  ALTER TABLE "articles" DROP COLUMN "sponsored_return_phrase_override_reason";
  ALTER TABLE "_articles_v" DROP COLUMN "version_second_read_escalated_at";
  ALTER TABLE "_articles_v" DROP COLUMN "version_sponsored_return_phrase_override";
  ALTER TABLE "_articles_v" DROP COLUMN "version_sponsored_return_phrase_override_reason";`)
}
