import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Wave 3 (red team, pass 2): `media.uploaded_by_id`, the system field that
 * limits reporters and the commercial desk to editing their own images.
 * Images imported earlier have no uploader: only editors change them.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN "uploaded_by_id" integer;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" DROP CONSTRAINT "media_uploaded_by_id_users_id_fk";
  DROP INDEX "media_uploaded_by_idx";
  ALTER TABLE "media" DROP COLUMN "uploaded_by_id";`)
}
