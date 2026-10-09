import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_sources_type" AS ENUM('document', 'report', 'interview', 'press', 'data');
  CREATE TYPE "public"."enum_articles_workflow_history_from" AS ENUM('idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn');
  CREATE TYPE "public"."enum_articles_workflow_history_to" AS ENUM('idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn');
  CREATE TYPE "public"."enum_articles_corrections_kind" AS ENUM('correction', 'clarification', 'editors_note');
  CREATE TYPE "public"."enum_articles_corrections_telegram_action" AS ENUM('none', 'caption_edited', 'reply_posted');
  CREATE TYPE "public"."enum_articles_workflow_status" AS ENUM('idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn');
  CREATE TYPE "public"."enum_articles_dueat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_priority" AS ENUM('normal', 'high', 'breaking');
  CREATE TYPE "public"."enum_articles_publishedat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_firstpublishedat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_significantupdateat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_scheduledat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_embargo_until_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_second_read_dueat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_second_read_outcome" AS ENUM('ok', 'minor_fix', 'correction');
  CREATE TYPE "public"."enum_articles_change_note_kind" AS ENUM('minor', 'update', 'correction', 'clarification', 'editors_note');
  CREATE TYPE "public"."enum_articles_sponsored_category" AS ENUM('general', 'financial_service', 'bank_deposit', 'investment_securities', 'insurance_takaful');
  CREATE TYPE "public"."enum_articles_sponsored_campaignstart_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_sponsored_campaignend_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_articles_needs_legal" AS ENUM('na', 'required', 'complete');
  CREATE TYPE "public"."enum_articles_needs_picture" AS ENUM('na', 'required', 'complete');
  CREATE TYPE "public"."enum_articles_age_mark" AS ENUM('inherit', '0+', '7+', '12+', '16+', '18+');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_articles_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum__articles_v_version_sources_type" AS ENUM('document', 'report', 'interview', 'press', 'data');
  CREATE TYPE "public"."enum__articles_v_version_workflow_history_from" AS ENUM('idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn');
  CREATE TYPE "public"."enum__articles_v_version_workflow_history_to" AS ENUM('idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn');
  CREATE TYPE "public"."enum__articles_v_version_corrections_kind" AS ENUM('correction', 'clarification', 'editors_note');
  CREATE TYPE "public"."enum__articles_v_version_corrections_telegram_action" AS ENUM('none', 'caption_edited', 'reply_posted');
  CREATE TYPE "public"."enum__articles_v_version_workflow_status" AS ENUM('idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn');
  CREATE TYPE "public"."enum__articles_v_version_dueat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_priority" AS ENUM('normal', 'high', 'breaking');
  CREATE TYPE "public"."enum__articles_v_version_publishedat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_firstpublishedat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_significantupdateat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_scheduledat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_embargo_until_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_second_read_dueat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_second_read_outcome" AS ENUM('ok', 'minor_fix', 'correction');
  CREATE TYPE "public"."enum__articles_v_version_change_note_kind" AS ENUM('minor', 'update', 'correction', 'clarification', 'editors_note');
  CREATE TYPE "public"."enum__articles_v_version_sponsored_category" AS ENUM('general', 'financial_service', 'bank_deposit', 'investment_securities', 'insurance_takaful');
  CREATE TYPE "public"."enum__articles_v_version_sponsored_campaignstart_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_sponsored_campaignend_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__articles_v_version_needs_legal" AS ENUM('na', 'required', 'complete');
  CREATE TYPE "public"."enum__articles_v_version_needs_picture" AS ENUM('na', 'required', 'complete');
  CREATE TYPE "public"."enum__articles_v_version_age_mark" AS ENUM('inherit', '0+', '7+', '12+', '16+', '18+');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum__articles_v_version_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum_authors_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__authors_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__authors_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum_rubrics_slug" AS ENUM('yangiliklar', 'tahlil', 'intervyu', 'izoh', 'dunyo');
  CREATE TYPE "public"."enum_rubrics_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__rubrics_v_version_slug" AS ENUM('yangiliklar', 'tahlil', 'intervyu', 'izoh', 'dunyo');
  CREATE TYPE "public"."enum__rubrics_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__rubrics_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum_tags_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tags_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tags_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum_media_rights_category" AS ENUM('staff', 'commissioned', 'agency', 'official_handout', 'partner_supplied', 'creative_commons', 'public_domain', 'screengrab', 'social_media', 'unknown');
  CREATE TYPE "public"."enum_glossary_terms_category" AS ENUM('shartnoma', 'tamoyil', 'institut', 'bozor', 'standart');
  CREATE TYPE "public"."enum_glossary_terms_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_glossary_terms_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum__glossary_terms_v_version_category" AS ENUM('shartnoma', 'tamoyil', 'institut', 'bozor', 'standart');
  CREATE TYPE "public"."enum__glossary_terms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__glossary_terms_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum__glossary_terms_v_version_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum_institutions_status_history_status" AS ENUM('granted', 'review', 'applied', 'announced');
  CREATE TYPE "public"."enum_institutions_type" AS ENUM('bank', 'window', 'microfinance', 'leasing', 'takaful');
  CREATE TYPE "public"."enum_institutions_licence_status" AS ENUM('granted', 'review', 'applied', 'announced');
  CREATE TYPE "public"."enum_institutions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_institutions_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum__institutions_v_version_status_history_status" AS ENUM('granted', 'review', 'applied', 'announced');
  CREATE TYPE "public"."enum__institutions_v_version_type" AS ENUM('bank', 'window', 'microfinance', 'leasing', 'takaful');
  CREATE TYPE "public"."enum__institutions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__institutions_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum__institutions_v_version_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum_milestones_milestone_status" AS ENUM('done', 'upcoming');
  CREATE TYPE "public"."enum_milestones_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_milestones_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum__milestones_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__milestones_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum__milestones_v_version_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum_club_events_startsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_club_events_endsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_club_events_registrationclosesat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_club_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_club_events_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum__club_events_v_version_startsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__club_events_v_version_endsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__club_events_v_version_registrationclosesat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__club_events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__club_events_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum__club_events_v_version_translation_status" AS ENUM('missing', 'machine_draft', 'in_edit', 'approved', 'outdated');
  CREATE TYPE "public"."enum_requests_kind" AS ENUM('error_report', 'refutation', 'reply', 'removal', 'other');
  CREATE TYPE "public"."enum_requests_receivedat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_requests_channel" AS ENUM('site_form', 'email', 'phone', 'post', 'telegram', 'staff');
  CREATE TYPE "public"."enum_requests_status" AS ENUM('new', 'triage', 'in_progress', 'decided', 'closed');
  CREATE TYPE "public"."enum_requests_decision" AS ENUM('no_change', 'correction', 'refutation_published', 'reply_published', 'anonymised', 'noindex', 'withdrawn', 'declined');
  CREATE TYPE "public"."enum_telegram_posts_kind" AS ENUM('article', 'correction_reply', 'retraction');
  CREATE TYPE "public"."enum_telegram_posts_status" AS ENUM('draft', 'approved', 'queued', 'sent', 'edit_pending', 'edited', 'cancelled', 'retracted', 'failed');
  CREATE TYPE "public"."enum_telegram_posts_sendat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_club_applications_interests" AS ENUM('murobaha', 'ijora', 'mushoraka', 'takaful', 'boshqa');
  CREATE TYPE "public"."enum_club_applications_sector" AS ENUM('savdo', 'ishlab-chiqarish', 'qurilish', 'qishloq-xojaligi', 'xizmatlar', 'it', 'boshqa');
  CREATE TYPE "public"."enum_club_applications_size" AS ENUM('1-10', '11-50', '51-250', '250+');
  CREATE TYPE "public"."enum_club_applications_status" AS ENUM('new', 'contacted', 'accepted', 'declined', 'attended');
  CREATE TYPE "public"."enum_club_applications_source_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_club_applications_consent_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_digest_subscribers_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_digest_subscribers_status" AS ENUM('pending', 'confirmed', 'unsubscribed');
  CREATE TYPE "public"."enum_digest_subscribers_source_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_digest_subscribers_consent_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_contact_messages_topic" AS ENUM('tahririyat', 'tuzatish', 'reklama', 'klub', 'boshqa');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'in_progress', 'closed');
  CREATE TYPE "public"."enum_contact_messages_source_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_contact_messages_consent_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_advertising_requests_format" AS ENUM('banner', 'sponsored', 'telegram', 'digest', 'club', 'several');
  CREATE TYPE "public"."enum_advertising_requests_budget" AS ENUM('upTo10', 'upTo30', 'upTo100', 'over100', 'unknown');
  CREATE TYPE "public"."enum_advertising_requests_status" AS ENUM('new', 'in_progress', 'won', 'lost');
  CREATE TYPE "public"."enum_advertising_requests_source_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_advertising_requests_consent_locale" AS ENUM('uz', 'kr', 'ru', 'en');
  CREATE TYPE "public"."enum_users_declared_interests_nature" AS ENUM('shares', 'employment', 'family', 'other');
  CREATE TYPE "public"."enum_publish_events_kind" AS ENUM('publish_first', 'publish_change', 'unpublish', 'withdraw', 'restore', 'delete', 'global_change', 'schedule_run');
  CREATE TYPE "public"."enum_publish_events_change_kind" AS ENUM('minor', 'update', 'correction', 'clarification', 'editors_note');
  CREATE TYPE "public"."enum_publish_events_status" AS ENUM('pending', 'done', 'failed');
  CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('301');
  CREATE TYPE "public"."enum_payload_query_presets_access_read_constraint" AS ENUM('everyone', 'onlyMe', 'specificUsers');
  CREATE TYPE "public"."enum_payload_query_presets_access_update_constraint" AS ENUM('everyone', 'onlyMe', 'specificUsers');
  CREATE TYPE "public"."enum_payload_query_presets_access_delete_constraint" AS ENUM('everyone', 'onlyMe', 'specificUsers');
  CREATE TYPE "public"."enum_payload_query_presets_related_collection" AS ENUM('articles');
  CREATE TYPE "public"."enum_home_page_pinned_until_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_home_page_breaking_until_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_version_pinned_until_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__home_page_v_version_breaking_until_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum_navigation_header_kind" AS ENUM('rubric', 'page', 'custom');
  CREATE TYPE "public"."enum_navigation_header_page" AS ENUM('lugat', 'xarita', 'klub', 'dayjest', 'about', 'advertise', 'contact');
  CREATE TYPE "public"."enum_navigation_footer_items_kind" AS ENUM('rubric', 'page', 'custom');
  CREATE TYPE "public"."enum_navigation_footer_items_page" AS ENUM('lugat', 'xarita', 'klub', 'dayjest', 'about', 'advertise', 'contact');
  CREATE TYPE "public"."enum_navigation_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navigation_v_version_header_kind" AS ENUM('rubric', 'page', 'custom');
  CREATE TYPE "public"."enum__navigation_v_version_header_page" AS ENUM('lugat', 'xarita', 'klub', 'dayjest', 'about', 'advertise', 'contact');
  CREATE TYPE "public"."enum__navigation_v_version_footer_items_kind" AS ENUM('rubric', 'page', 'custom');
  CREATE TYPE "public"."enum__navigation_v_version_footer_items_page" AS ENUM('lugat', 'xarita', 'klub', 'dayjest', 'about', 'advertise', 'contact');
  CREATE TYPE "public"."enum__navigation_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navigation_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum_ad_slots_slots_slot_id" AS ENUM('home-mid', 'home-mid-mobile', 'article-rail', 'rubric-yangiliklar-rail', 'rubric-tahlil-rail', 'rubric-intervyu-rail', 'rubric-izoh-rail', 'rubric-dunyo-rail', 'tag-rail', 'author-rail');
  CREATE TYPE "public"."enum_ad_slots_slots_format" AS ENUM('leaderboard', 'mpu', 'inline');
  CREATE TYPE "public"."enum_ad_slots_slots_category" AS ENUM('general', 'financial_service', 'bank_deposit', 'investment_securities', 'insurance_takaful');
  CREATE TYPE "public"."enum_ad_slots_slots_startsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_ad_slots_slots_endsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum_ad_slots_slots_age_mark" AS ENUM('0+', '7+', '12+', '16+', '18+');
  CREATE TYPE "public"."enum_ad_slots_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__ad_slots_v_version_slots_slot_id" AS ENUM('home-mid', 'home-mid-mobile', 'article-rail', 'rubric-yangiliklar-rail', 'rubric-tahlil-rail', 'rubric-intervyu-rail', 'rubric-izoh-rail', 'rubric-dunyo-rail', 'tag-rail', 'author-rail');
  CREATE TYPE "public"."enum__ad_slots_v_version_slots_format" AS ENUM('leaderboard', 'mpu', 'inline');
  CREATE TYPE "public"."enum__ad_slots_v_version_slots_category" AS ENUM('general', 'financial_service', 'bank_deposit', 'investment_securities', 'insurance_takaful');
  CREATE TYPE "public"."enum__ad_slots_v_version_slots_startsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__ad_slots_v_version_slots_endsat_tz" AS ENUM('Asia/Tashkent');
  CREATE TYPE "public"."enum__ad_slots_v_version_slots_age_mark" AS ENUM('0+', '7+', '12+', '16+', '18+');
  CREATE TYPE "public"."enum__ad_slots_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__ad_slots_v_published_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum_site_settings_telegram_invite_links_placement" AS ENUM('sticky', 'article_footer', 'club', 'digest', 'in_app');
  CREATE TYPE "public"."enum_site_settings_legal_age_mark_value" AS ENUM('0+', '7+', '12+', '16+', '18+');
  CREATE TYPE "public"."enum_site_settings_emergency_level" AS ENUM('info', 'warning');
  CREATE TYPE "public"."enum__site_settings_v_version_telegram_invite_links_placement" AS ENUM('sticky', 'article_footer', 'club', 'digest', 'in_app');
  CREATE TYPE "public"."enum__site_settings_v_version_legal_age_mark_value" AS ENUM('0+', '7+', '12+', '16+', '18+');
  CREATE TYPE "public"."enum__site_settings_v_version_emergency_level" AS ENUM('info', 'warning');
  CREATE TYPE "public"."enum_editorial_rules_return_phrases_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TYPE "public"."enum__editorial_rules_return_phrases_v_locale" AS ENUM('uz', 'ru', 'en');
  CREATE TABLE "articles_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"publisher" varchar,
  	"url" varchar,
  	"date" varchar,
  	"type" "enum_articles_sources_type"
  );
  
  CREATE TABLE "articles_workflow_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" "enum_articles_workflow_history_from",
  	"to" "enum_articles_workflow_history_to",
  	"by_id" integer,
  	"at" timestamp(3) with time zone,
  	"comment" varchar
  );
  
  CREATE TABLE "articles_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_articles_corrections_kind" DEFAULT 'correction',
  	"location" varchar,
  	"internal_reason" varchar,
  	"created_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"approved_by_id" integer,
  	"version_id" varchar,
  	"request_id" integer,
  	"telegram_action" "enum_articles_corrections_telegram_action" DEFAULT 'none'
  );
  
  CREATE TABLE "articles_corrections_locales" (
  	"public_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "articles_slug_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"rubric" varchar,
  	"changed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rubric_id" integer,
  	"slug" varchar,
  	"workflow_status" "enum_articles_workflow_status" DEFAULT 'idea',
  	"assignee_id" integer,
  	"desk_editor_id" integer,
  	"due_at" timestamp(3) with time zone,
  	"dueat_tz" "enum_articles_dueat_tz" DEFAULT 'Asia/Tashkent',
  	"priority" "enum_articles_priority" DEFAULT 'normal',
  	"urgent" boolean,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"image_id" integer,
  	"about_id" integer,
  	"interviewee_name" varchar,
  	"interviewee_role" varchar,
  	"interviewee_organisation" varchar,
  	"interviewee_portrait_id" integer,
  	"featured" boolean,
  	"published_at" timestamp(3) with time zone,
  	"publishedat_tz" "enum_articles_publishedat_tz" DEFAULT 'Asia/Tashkent',
  	"first_published_at" timestamp(3) with time zone,
  	"firstpublishedat_tz" "enum_articles_firstpublishedat_tz" DEFAULT 'Asia/Tashkent',
  	"significant_update_at" timestamp(3) with time zone,
  	"significantupdateat_tz" "enum_articles_significantupdateat_tz" DEFAULT 'Asia/Tashkent',
  	"scheduled_at" timestamp(3) with time zone,
  	"scheduledat_tz" "enum_articles_scheduledat_tz" DEFAULT 'Asia/Tashkent',
  	"embargo_until" timestamp(3) with time zone,
  	"embargo_until_tz" "enum_articles_embargo_until_tz" DEFAULT 'Asia/Tashkent',
  	"embargo_indefinite" boolean,
  	"embargo_source" varchar,
  	"embargo_note" varchar,
  	"submitted_by_id" integer,
  	"submitted_at" timestamp(3) with time zone,
  	"approved_by_id" integer,
  	"approved_at" timestamp(3) with time zone,
  	"approved_content_hash" varchar,
  	"published_by_id" integer,
  	"scheduled_by_id" integer,
  	"schedule_error" varchar,
  	"second_read_required" boolean,
  	"second_read_due_at" timestamp(3) with time zone,
  	"second_read_dueat_tz" "enum_articles_second_read_dueat_tz" DEFAULT 'Asia/Tashkent',
  	"second_read_done_by_id" integer,
  	"second_read_done_at" timestamp(3) with time zone,
  	"second_read_outcome" "enum_articles_second_read_outcome",
  	"change_note_kind" "enum_articles_change_note_kind",
  	"change_note_reason" varchar,
  	"change_note_numbers_override" boolean,
  	"withdrawal_at" timestamp(3) with time zone,
  	"withdrawal_by_id" integer,
  	"withdrawal_internal_reason" varchar,
  	"withdrawal_hide_title" boolean,
  	"withdrawal_request_id" integer,
  	"sponsored_enabled" boolean,
  	"sponsored_partner" varchar,
  	"sponsored_advertiser_legal_name" varchar,
  	"sponsored_category" "enum_articles_sponsored_category" DEFAULT 'general',
  	"sponsored_licence_number" varchar,
  	"sponsored_licence_issuer" varchar,
  	"sponsored_contract_ref" varchar,
  	"sponsored_campaign_start" timestamp(3) with time zone,
  	"sponsored_campaignstart_tz" "enum_articles_sponsored_campaignstart_tz" DEFAULT 'Asia/Tashkent',
  	"sponsored_campaign_end" timestamp(3) with time zone,
  	"sponsored_campaignend_tz" "enum_articles_sponsored_campaignend_tz" DEFAULT 'Asia/Tashkent',
  	"sponsored_approved_by_id" integer,
  	"sponsored_approved_at" timestamp(3) with time zone,
  	"sponsored_retain_until" timestamp(3) with time zone,
  	"kr_title" varchar,
  	"kr_lead" varchar,
  	"kr_kicker" varchar,
  	"kr_checked" boolean,
  	"kr_checked_by_id" integer,
  	"kr_checked_at" timestamp(3) with time zone,
  	"noindex" boolean,
  	"short_code" varchar,
  	"telegram_autopost" boolean DEFAULT true,
  	"telegram_caption_override" varchar,
  	"telegram_silent" boolean,
  	"editor_notes" varchar,
  	"source_notes" varchar,
  	"needs_legal" "enum_articles_needs_legal" DEFAULT 'na',
  	"needs_picture" "enum_articles_needs_picture" DEFAULT 'na',
  	"legal_sign_off_by_id" integer,
  	"legal_sign_off_at" timestamp(3) with time zone,
  	"legal_sign_off_note" varchar,
  	"legally_sensitive" boolean,
  	"single_anonymous_source" boolean,
  	"supervisor_id" integer,
  	"inappropriate_for_sponsorship" boolean,
  	"age_mark" "enum_articles_age_mark" DEFAULT 'inherit',
  	"legal_hold" boolean,
  	"validation_warnings" jsonb,
  	"views" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_locales" (
  	"title" varchar,
  	"kicker" varchar,
  	"lead" varchar,
  	"body" jsonb,
  	"image_caption" varchar,
  	"withdrawal_public_notice" varchar,
  	"sponsored_risk_warning" varchar,
  	"sponsored_key_terms" varchar,
  	"sponsored_disclosure" varchar,
  	"translation_status" "enum_articles_translation_status" DEFAULT 'missing',
  	"translation_assignee_id" integer,
  	"translation_translated_by_id" integer,
  	"translation_reviewed_by_id" integer,
  	"translation_approved_at" timestamp(3) with time zone,
  	"translation_content_hash" varchar,
  	"translation_machine_used" boolean,
  	"translation_machine_engine" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"authors_id" integer,
  	"tags_id" integer,
  	"glossary_terms_id" integer,
  	"institutions_id" integer,
  	"articles_id" integer,
  	"users_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_articles_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"publisher" varchar,
  	"url" varchar,
  	"date" varchar,
  	"type" "enum__articles_v_version_sources_type",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_workflow_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" "enum__articles_v_version_workflow_history_from",
  	"to" "enum__articles_v_version_workflow_history_to",
  	"by_id" integer,
  	"at" timestamp(3) with time zone,
  	"comment" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__articles_v_version_corrections_kind" DEFAULT 'correction',
  	"location" varchar,
  	"internal_reason" varchar,
  	"created_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"approved_by_id" integer,
  	"version_id" varchar,
  	"request_id" integer,
  	"telegram_action" "enum__articles_v_version_corrections_telegram_action" DEFAULT 'none',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_corrections_locales" (
  	"public_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v_version_slug_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"rubric" varchar,
  	"changed_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_rubric_id" integer,
  	"version_slug" varchar,
  	"version_workflow_status" "enum__articles_v_version_workflow_status" DEFAULT 'idea',
  	"version_assignee_id" integer,
  	"version_desk_editor_id" integer,
  	"version_due_at" timestamp(3) with time zone,
  	"version_dueat_tz" "enum__articles_v_version_dueat_tz" DEFAULT 'Asia/Tashkent',
  	"version_priority" "enum__articles_v_version_priority" DEFAULT 'normal',
  	"version_urgent" boolean,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_image_id" integer,
  	"version_about_id" integer,
  	"version_interviewee_name" varchar,
  	"version_interviewee_role" varchar,
  	"version_interviewee_organisation" varchar,
  	"version_interviewee_portrait_id" integer,
  	"version_featured" boolean,
  	"version_published_at" timestamp(3) with time zone,
  	"version_publishedat_tz" "enum__articles_v_version_publishedat_tz" DEFAULT 'Asia/Tashkent',
  	"version_first_published_at" timestamp(3) with time zone,
  	"version_firstpublishedat_tz" "enum__articles_v_version_firstpublishedat_tz" DEFAULT 'Asia/Tashkent',
  	"version_significant_update_at" timestamp(3) with time zone,
  	"version_significantupdateat_tz" "enum__articles_v_version_significantupdateat_tz" DEFAULT 'Asia/Tashkent',
  	"version_scheduled_at" timestamp(3) with time zone,
  	"version_scheduledat_tz" "enum__articles_v_version_scheduledat_tz" DEFAULT 'Asia/Tashkent',
  	"version_embargo_until" timestamp(3) with time zone,
  	"version_embargo_until_tz" "enum__articles_v_version_embargo_until_tz" DEFAULT 'Asia/Tashkent',
  	"version_embargo_indefinite" boolean,
  	"version_embargo_source" varchar,
  	"version_embargo_note" varchar,
  	"version_submitted_by_id" integer,
  	"version_submitted_at" timestamp(3) with time zone,
  	"version_approved_by_id" integer,
  	"version_approved_at" timestamp(3) with time zone,
  	"version_approved_content_hash" varchar,
  	"version_published_by_id" integer,
  	"version_scheduled_by_id" integer,
  	"version_schedule_error" varchar,
  	"version_second_read_required" boolean,
  	"version_second_read_due_at" timestamp(3) with time zone,
  	"version_second_read_dueat_tz" "enum__articles_v_version_second_read_dueat_tz" DEFAULT 'Asia/Tashkent',
  	"version_second_read_done_by_id" integer,
  	"version_second_read_done_at" timestamp(3) with time zone,
  	"version_second_read_outcome" "enum__articles_v_version_second_read_outcome",
  	"version_change_note_kind" "enum__articles_v_version_change_note_kind",
  	"version_change_note_reason" varchar,
  	"version_change_note_numbers_override" boolean,
  	"version_withdrawal_at" timestamp(3) with time zone,
  	"version_withdrawal_by_id" integer,
  	"version_withdrawal_internal_reason" varchar,
  	"version_withdrawal_hide_title" boolean,
  	"version_withdrawal_request_id" integer,
  	"version_sponsored_enabled" boolean,
  	"version_sponsored_partner" varchar,
  	"version_sponsored_advertiser_legal_name" varchar,
  	"version_sponsored_category" "enum__articles_v_version_sponsored_category" DEFAULT 'general',
  	"version_sponsored_licence_number" varchar,
  	"version_sponsored_licence_issuer" varchar,
  	"version_sponsored_contract_ref" varchar,
  	"version_sponsored_campaign_start" timestamp(3) with time zone,
  	"version_sponsored_campaignstart_tz" "enum__articles_v_version_sponsored_campaignstart_tz" DEFAULT 'Asia/Tashkent',
  	"version_sponsored_campaign_end" timestamp(3) with time zone,
  	"version_sponsored_campaignend_tz" "enum__articles_v_version_sponsored_campaignend_tz" DEFAULT 'Asia/Tashkent',
  	"version_sponsored_approved_by_id" integer,
  	"version_sponsored_approved_at" timestamp(3) with time zone,
  	"version_sponsored_retain_until" timestamp(3) with time zone,
  	"version_kr_title" varchar,
  	"version_kr_lead" varchar,
  	"version_kr_kicker" varchar,
  	"version_kr_checked" boolean,
  	"version_kr_checked_by_id" integer,
  	"version_kr_checked_at" timestamp(3) with time zone,
  	"version_noindex" boolean,
  	"version_short_code" varchar,
  	"version_telegram_autopost" boolean DEFAULT true,
  	"version_telegram_caption_override" varchar,
  	"version_telegram_silent" boolean,
  	"version_editor_notes" varchar,
  	"version_source_notes" varchar,
  	"version_needs_legal" "enum__articles_v_version_needs_legal" DEFAULT 'na',
  	"version_needs_picture" "enum__articles_v_version_needs_picture" DEFAULT 'na',
  	"version_legal_sign_off_by_id" integer,
  	"version_legal_sign_off_at" timestamp(3) with time zone,
  	"version_legal_sign_off_note" varchar,
  	"version_legally_sensitive" boolean,
  	"version_single_anonymous_source" boolean,
  	"version_supervisor_id" integer,
  	"version_inappropriate_for_sponsorship" boolean,
  	"version_age_mark" "enum__articles_v_version_age_mark" DEFAULT 'inherit',
  	"version_legal_hold" boolean,
  	"version_validation_warnings" jsonb,
  	"version_views" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articles_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_articles_v_locales" (
  	"version_title" varchar,
  	"version_kicker" varchar,
  	"version_lead" varchar,
  	"version_body" jsonb,
  	"version_image_caption" varchar,
  	"version_withdrawal_public_notice" varchar,
  	"version_sponsored_risk_warning" varchar,
  	"version_sponsored_key_terms" varchar,
  	"version_sponsored_disclosure" varchar,
  	"version_translation_status" "enum__articles_v_version_translation_status" DEFAULT 'missing',
  	"version_translation_assignee_id" integer,
  	"version_translation_translated_by_id" integer,
  	"version_translation_reviewed_by_id" integer,
  	"version_translation_approved_at" timestamp(3) with time zone,
  	"version_translation_content_hash" varchar,
  	"version_translation_machine_used" boolean,
  	"version_translation_machine_engine" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"authors_id" integer,
  	"tags_id" integer,
  	"glossary_terms_id" integer,
  	"institutions_id" integer,
  	"articles_id" integer,
  	"users_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "authors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"commercial" boolean,
  	"is_team" boolean,
  	"email" varchar,
  	"telegram" varchar,
  	"portrait_id" integer,
  	"active" boolean DEFAULT true,
  	"user_id" integer,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_authors_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "authors_locales" (
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_authors_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_commercial" boolean,
  	"version_is_team" boolean,
  	"version_email" varchar,
  	"version_telegram" varchar,
  	"version_portrait_id" integer,
  	"version_active" boolean DEFAULT true,
  	"version_user_id" integer,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__authors_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__authors_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_authors_v_locales" (
  	"version_name" varchar,
  	"version_role" varchar,
  	"version_bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "rubrics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" "enum_rubrics_slug",
  	"order" numeric,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_rubrics_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "rubrics_locales" (
  	"name" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_rubrics_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" "enum__rubrics_v_version_slug",
  	"version_order" numeric,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__rubrics_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__rubrics_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_rubrics_v_locales" (
  	"version_name" varchar,
  	"version_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tags_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "tags_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tags_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tags_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__tags_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_tags_v_locales" (
  	"version_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "glossary_terms_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "glossary_terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"needs_review" boolean,
  	"category" "enum_glossary_terms_category",
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"term" varchar,
  	"aliases_ru" varchar,
  	"aliases_en" varchar,
  	"aliases_ar" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_glossary_terms_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "glossary_terms_locales" (
  	"short" varchar,
  	"definition" jsonb,
  	"origin" jsonb,
  	"practice" jsonb,
  	"example_title" varchar,
  	"example_text" jsonb,
  	"translation_status" "enum_glossary_terms_translation_status" DEFAULT 'missing',
  	"translation_assignee_id" integer,
  	"translation_translated_by_id" integer,
  	"translation_reviewed_by_id" integer,
  	"translation_approved_at" timestamp(3) with time zone,
  	"translation_content_hash" varchar,
  	"translation_machine_used" boolean,
  	"translation_machine_engine" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "glossary_terms_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "glossary_terms_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"glossary_terms_id" integer
  );
  
  CREATE TABLE "_glossary_terms_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glossary_terms_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_needs_review" boolean,
  	"version_category" "enum__glossary_terms_v_version_category",
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_term" varchar,
  	"version_aliases_ru" varchar,
  	"version_aliases_en" varchar,
  	"version_aliases_ar" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__glossary_terms_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__glossary_terms_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_glossary_terms_v_locales" (
  	"version_short" varchar,
  	"version_definition" jsonb,
  	"version_origin" jsonb,
  	"version_practice" jsonb,
  	"version_example_title" varchar,
  	"version_example_text" jsonb,
  	"version_translation_status" "enum__glossary_terms_v_version_translation_status" DEFAULT 'missing',
  	"version_translation_assignee_id" integer,
  	"version_translation_translated_by_id" integer,
  	"version_translation_reviewed_by_id" integer,
  	"version_translation_approved_at" timestamp(3) with time zone,
  	"version_translation_content_hash" varchar,
  	"version_translation_machine_used" boolean,
  	"version_translation_machine_engine" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_glossary_terms_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_glossary_terms_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"glossary_terms_id" integer
  );
  
  CREATE TABLE "institutions_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "enum_institutions_status_history_status",
  	"date" varchar,
  	"source" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "institutions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"type" "enum_institutions_type",
  	"parent" varchar,
  	"city" varchar,
  	"status" "enum_institutions_licence_status",
  	"status_date" varchar,
  	"status_source" varchar,
  	"licence_number" varchar,
  	"article_id" integer,
  	"needs_review" boolean,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_institutions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "institutions_locales" (
  	"note" varchar,
  	"translation_status" "enum_institutions_translation_status" DEFAULT 'missing',
  	"translation_assignee_id" integer,
  	"translation_translated_by_id" integer,
  	"translation_reviewed_by_id" integer,
  	"translation_approved_at" timestamp(3) with time zone,
  	"translation_content_hash" varchar,
  	"translation_machine_used" boolean,
  	"translation_machine_engine" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "institutions_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_institutions_v_version_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum__institutions_v_version_status_history_status",
  	"date" varchar,
  	"source" varchar,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_institutions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_type" "enum__institutions_v_version_type",
  	"version_parent" varchar,
  	"version_city" varchar,
  	"version_status" "enum_institutions_licence_status",
  	"version_status_date" varchar,
  	"version_status_source" varchar,
  	"version_licence_number" varchar,
  	"version_article_id" integer,
  	"version_needs_review" boolean,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__institutions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__institutions_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_institutions_v_locales" (
  	"version_note" varchar,
  	"version_translation_status" "enum__institutions_v_version_translation_status" DEFAULT 'missing',
  	"version_translation_assignee_id" integer,
  	"version_translation_translated_by_id" integer,
  	"version_translation_reviewed_by_id" integer,
  	"version_translation_approved_at" timestamp(3) with time zone,
  	"version_translation_content_hash" varchar,
  	"version_translation_machine_used" boolean,
  	"version_translation_machine_engine" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_institutions_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "milestones" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"status" "enum_milestones_milestone_status",
  	"article_id" integer,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_milestones_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "milestones_locales" (
  	"title" varchar,
  	"text" varchar,
  	"translation_status" "enum_milestones_translation_status" DEFAULT 'missing',
  	"translation_assignee_id" integer,
  	"translation_translated_by_id" integer,
  	"translation_reviewed_by_id" integer,
  	"translation_approved_at" timestamp(3) with time zone,
  	"translation_content_hash" varchar,
  	"translation_machine_used" boolean,
  	"translation_machine_engine" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_milestones_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_date" varchar,
  	"version_status" "enum_milestones_milestone_status",
  	"version_article_id" integer,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__milestones_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__milestones_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_milestones_v_locales" (
  	"version_title" varchar,
  	"version_text" varchar,
  	"version_translation_status" "enum__milestones_v_version_translation_status" DEFAULT 'missing',
  	"version_translation_assignee_id" integer,
  	"version_translation_translated_by_id" integer,
  	"version_translation_reviewed_by_id" integer,
  	"version_translation_approved_at" timestamp(3) with time zone,
  	"version_translation_content_hash" varchar,
  	"version_translation_machine_used" boolean,
  	"version_translation_machine_engine" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "club_events_agenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"speaker" varchar
  );
  
  CREATE TABLE "club_events_agenda_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "club_events_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"portrait_id" integer
  );
  
  CREATE TABLE "club_events_takeaways" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "club_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"number" numeric,
  	"last_edited_by_id" integer,
  	"legacy_id" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_club_events_startsat_tz" DEFAULT 'Asia/Tashkent',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_club_events_endsat_tz" DEFAULT 'Asia/Tashkent',
  	"venue_name" varchar,
  	"venue_address" varchar,
  	"venue_city" varchar,
  	"image_id" integer,
  	"capacity" numeric,
  	"registration_open" boolean,
  	"registration_closes_at" timestamp(3) with time zone,
  	"registrationclosesat_tz" "enum_club_events_registrationclosesat_tz" DEFAULT 'Asia/Tashkent',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_club_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "club_events_locales" (
  	"title" varchar,
  	"theme" varchar,
  	"summary" varchar,
  	"image_caption" varchar,
  	"report" jsonb,
  	"translation_status" "enum_club_events_translation_status" DEFAULT 'missing',
  	"translation_assignee_id" integer,
  	"translation_translated_by_id" integer,
  	"translation_reviewed_by_id" integer,
  	"translation_approved_at" timestamp(3) with time zone,
  	"translation_content_hash" varchar,
  	"translation_machine_used" boolean,
  	"translation_machine_engine" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_club_events_v_version_agenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"speaker" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_club_events_v_version_agenda_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_club_events_v_version_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"portrait_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_club_events_v_version_takeaways" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_club_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_number" numeric,
  	"version_last_edited_by_id" integer,
  	"version_legacy_id" varchar,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_startsat_tz" "enum__club_events_v_version_startsat_tz" DEFAULT 'Asia/Tashkent',
  	"version_ends_at" timestamp(3) with time zone,
  	"version_endsat_tz" "enum__club_events_v_version_endsat_tz" DEFAULT 'Asia/Tashkent',
  	"version_venue_name" varchar,
  	"version_venue_address" varchar,
  	"version_venue_city" varchar,
  	"version_image_id" integer,
  	"version_capacity" numeric,
  	"version_registration_open" boolean,
  	"version_registration_closes_at" timestamp(3) with time zone,
  	"version_registrationclosesat_tz" "enum__club_events_v_version_registrationclosesat_tz" DEFAULT 'Asia/Tashkent',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__club_events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__club_events_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_club_events_v_locales" (
  	"version_title" varchar,
  	"version_theme" varchar,
  	"version_summary" varchar,
  	"version_image_caption" varchar,
  	"version_report" jsonb,
  	"version_translation_status" "enum__club_events_v_version_translation_status" DEFAULT 'missing',
  	"version_translation_assignee_id" integer,
  	"version_translation_translated_by_id" integer,
  	"version_translation_reviewed_by_id" integer,
  	"version_translation_approved_at" timestamp(3) with time zone,
  	"version_translation_content_hash" varchar,
  	"version_translation_machine_used" boolean,
  	"version_translation_machine_engine" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_requests_kind" DEFAULT 'error_report' NOT NULL,
  	"article_id" integer,
  	"requester_name" varchar,
  	"requester_contact" varchar,
  	"received_at" timestamp(3) with time zone NOT NULL,
  	"receivedat_tz" "enum_requests_receivedat_tz" DEFAULT 'Asia/Tashkent' NOT NULL,
  	"channel" "enum_requests_channel",
  	"summary" varchar NOT NULL,
  	"documents" varchar,
  	"assigned_to_id" integer,
  	"due_at" timestamp(3) with time zone,
  	"status" "enum_requests_status" DEFAULT 'new' NOT NULL,
  	"decision" "enum_requests_decision",
  	"decided_by_id" integer,
  	"decided_at" timestamp(3) with time zone,
  	"response" varchar,
  	"retain_until" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "telegram_posts_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"action" varchar,
  	"caption_html" varchar
  );
  
  CREATE TABLE "telegram_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"article_id" integer,
  	"kind" "enum_telegram_posts_kind" DEFAULT 'article' NOT NULL,
  	"status" "enum_telegram_posts_status" DEFAULT 'draft' NOT NULL,
  	"caption_html" varchar,
  	"photo_id" integer,
  	"image_file_id" varchar,
  	"silent" boolean,
  	"sponsored" boolean,
  	"requested_by_id" integer,
  	"approved_by_id" integer,
  	"send_at" timestamp(3) with time zone,
  	"sendat_tz" "enum_telegram_posts_sendat_tz" DEFAULT 'Asia/Tashkent',
  	"chat_id" varchar,
  	"message_id" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"reply_to" varchar,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "club_applications_interests" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_club_applications_interests",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "club_applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"company" varchar NOT NULL,
  	"sector" "enum_club_applications_sector" NOT NULL,
  	"size" "enum_club_applications_size" NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"message" varchar,
  	"attend" boolean,
  	"event_id" integer,
  	"status" "enum_club_applications_status" DEFAULT 'new' NOT NULL,
  	"assigned_to_id" integer,
  	"internal_notes" varchar,
  	"source_path" varchar,
  	"source_locale" "enum_club_applications_source_locale",
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_text_version" varchar NOT NULL,
  	"consent_locale" "enum_club_applications_consent_locale",
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"retain_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "digest_subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"locale" "enum_digest_subscribers_locale",
  	"placement" varchar,
  	"confirm_token_hash" varchar,
  	"confirmed_at" timestamp(3) with time zone,
  	"unsubscribed_at" timestamp(3) with time zone,
  	"status" "enum_digest_subscribers_status" DEFAULT 'pending' NOT NULL,
  	"assigned_to_id" integer,
  	"internal_notes" varchar,
  	"source_path" varchar,
  	"source_locale" "enum_digest_subscribers_source_locale",
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_text_version" varchar NOT NULL,
  	"consent_locale" "enum_digest_subscribers_consent_locale",
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"retain_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"topic" "enum_contact_messages_topic" NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"url" varchar,
  	"message" varchar NOT NULL,
  	"article_id" integer,
  	"status" "enum_contact_messages_status" DEFAULT 'new' NOT NULL,
  	"assigned_to_id" integer,
  	"internal_notes" varchar,
  	"source_path" varchar,
  	"source_locale" "enum_contact_messages_source_locale",
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_text_version" varchar NOT NULL,
  	"consent_locale" "enum_contact_messages_consent_locale",
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"retain_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "advertising_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"company" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"format" "enum_advertising_requests_format" NOT NULL,
  	"budget" "enum_advertising_requests_budget",
  	"message" varchar NOT NULL,
  	"contract" boolean,
  	"status" "enum_advertising_requests_status" DEFAULT 'new' NOT NULL,
  	"assigned_to_id" integer,
  	"internal_notes" varchar,
  	"source_path" varchar,
  	"source_locale" "enum_advertising_requests_source_locale",
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_text_version" varchar NOT NULL,
  	"consent_locale" "enum_advertising_requests_consent_locale",
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"retain_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_declared_interests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"institution_id" integer NOT NULL,
  	"nature" "enum_users_declared_interests_nature" NOT NULL,
  	"since" timestamp(3) with time zone,
  	"note" varchar
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"actor_id" numeric,
  	"actor_email" varchar,
  	"actor_role" varchar,
  	"action" varchar NOT NULL,
  	"collection" varchar,
  	"doc_id" varchar,
  	"doc_title" varchar,
  	"locale" varchar,
  	"version_id" varchar,
  	"summary" varchar,
  	"changed_paths" jsonb,
  	"before" jsonb,
  	"after" jsonb,
  	"ip" varchar,
  	"country" varchar,
  	"user_agent" varchar,
  	"request_id" varchar,
  	"prev_hash" varchar,
  	"hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "publish_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"collection" varchar NOT NULL,
  	"doc_id" varchar,
  	"kind" "enum_publish_events_kind" NOT NULL,
  	"change_kind" "enum_publish_events_change_kind",
  	"actor_id" numeric,
  	"targets" jsonb,
  	"status" "enum_publish_events_status" DEFAULT 'pending' NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"last_error" varchar,
  	"processed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"type" "enum_redirects_type" DEFAULT '301' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"glossary_terms_id" integer,
  	"club_events_id" integer,
  	"authors_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "payload_query_presets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"is_shared" boolean DEFAULT false,
  	"access_read_constraint" "enum_payload_query_presets_access_read_constraint" DEFAULT 'onlyMe',
  	"access_update_constraint" "enum_payload_query_presets_access_update_constraint" DEFAULT 'onlyMe',
  	"access_delete_constraint" "enum_payload_query_presets_access_delete_constraint" DEFAULT 'onlyMe',
  	"where" jsonb,
  	"columns" jsonb,
  	"group_by" varchar,
  	"related_collection" "enum_payload_query_presets_related_collection" NOT NULL,
  	"is_temp" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_query_presets_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "home_page_pinned" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"article_id" integer,
  	"until" timestamp(3) with time zone,
  	"until_tz" "enum_home_page_pinned_until_tz" DEFAULT 'Asia/Tashkent'
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lead_id" integer,
  	"breaking_enabled" boolean DEFAULT false,
  	"breaking_article_id" integer,
  	"breaking_until" timestamp(3) with time zone,
  	"breaking_until_tz" "enum_home_page_breaking_until_tz" DEFAULT 'Asia/Tashkent',
  	"interview_feature_id" integer,
  	"sponsored_teaser_id" integer,
  	"launched_by_id" integer,
  	"launched_at" timestamp(3) with time zone,
  	"_status" "enum_home_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_locales" (
  	"breaking_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "_home_page_v_version_pinned" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"article_id" integer,
  	"until" timestamp(3) with time zone,
  	"until_tz" "enum__home_page_v_version_pinned_until_tz" DEFAULT 'Asia/Tashkent',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_lead_id" integer,
  	"version_breaking_enabled" boolean DEFAULT false,
  	"version_breaking_article_id" integer,
  	"version_breaking_until" timestamp(3) with time zone,
  	"version_breaking_until_tz" "enum__home_page_v_version_breaking_until_tz" DEFAULT 'Asia/Tashkent',
  	"version_interview_feature_id" integer,
  	"version_sponsored_teaser_id" integer,
  	"version_launched_by_id" integer,
  	"version_launched_at" timestamp(3) with time zone,
  	"version__status" "enum__home_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_home_page_v_locales" (
  	"version_breaking_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "navigation_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_navigation_header_kind" DEFAULT 'rubric',
  	"rubric_id" integer,
  	"page" "enum_navigation_header_page",
  	"path" varchar,
  	"visible" boolean DEFAULT true
  );
  
  CREATE TABLE "navigation_header_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_navigation_footer_items_kind" DEFAULT 'rubric',
  	"rubric_id" integer,
  	"page" "enum_navigation_footer_items_page",
  	"path" varchar,
  	"visible" boolean DEFAULT true
  );
  
  CREATE TABLE "navigation_footer_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "navigation_footer_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_navigation_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_navigation_v_version_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__navigation_v_version_header_kind" DEFAULT 'rubric',
  	"rubric_id" integer,
  	"page" "enum__navigation_v_version_header_page",
  	"path" varchar,
  	"visible" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_header_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v_version_footer_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__navigation_v_version_footer_items_kind" DEFAULT 'rubric',
  	"rubric_id" integer,
  	"page" "enum__navigation_v_version_footer_items_page",
  	"path" varchar,
  	"visible" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_footer_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v_version_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_footer_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__navigation_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__navigation_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "ad_slots_slots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slot_id" "enum_ad_slots_slots_slot_id",
  	"format" "enum_ad_slots_slots_format",
  	"enabled" boolean DEFAULT false,
  	"creative_id" integer,
  	"creative_uz_id" integer,
  	"link_url" varchar,
  	"advertiser_name" varchar,
  	"category" "enum_ad_slots_slots_category" DEFAULT 'general',
  	"licence_number" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_ad_slots_slots_startsat_tz" DEFAULT 'Asia/Tashkent',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_ad_slots_slots_endsat_tz" DEFAULT 'Asia/Tashkent',
  	"contract_ref" varchar,
  	"age_mark" "enum_ad_slots_slots_age_mark"
  );
  
  CREATE TABLE "ad_slots_slots_locales" (
  	"creative_alt" varchar,
  	"risk_warning" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "ad_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_ad_slots_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_ad_slots_v_version_slots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"slot_id" "enum__ad_slots_v_version_slots_slot_id",
  	"format" "enum__ad_slots_v_version_slots_format",
  	"enabled" boolean DEFAULT false,
  	"creative_id" integer,
  	"creative_uz_id" integer,
  	"link_url" varchar,
  	"advertiser_name" varchar,
  	"category" "enum__ad_slots_v_version_slots_category" DEFAULT 'general',
  	"licence_number" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum__ad_slots_v_version_slots_startsat_tz" DEFAULT 'Asia/Tashkent',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum__ad_slots_v_version_slots_endsat_tz" DEFAULT 'Asia/Tashkent',
  	"contract_ref" varchar,
  	"age_mark" "enum__ad_slots_v_version_slots_age_mark",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_ad_slots_v_version_slots_locales" (
  	"creative_alt" varchar,
  	"risk_warning" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_ad_slots_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__ad_slots_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__ad_slots_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "site_settings_telegram_invite_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"placement" "enum_site_settings_telegram_invite_links_placement" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_alert_recipients" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar DEFAULT 'Muomalat' NOT NULL,
  	"domain" varchar DEFAULT 'muomalat.uz' NOT NULL,
  	"email" varchar DEFAULT 'info@muomalat.uz',
  	"founded_year" numeric DEFAULT 2026,
  	"legal_registration_number_value" varchar DEFAULT '№ 0000',
  	"legal_registration_number_placeholder" boolean DEFAULT true,
  	"legal_registration_date_value" varchar DEFAULT 'KK.OO.YYYY',
  	"legal_registration_date_placeholder" boolean DEFAULT true,
  	"legal_registrar_value" varchar DEFAULT 'Ommaviy kommunikatsiyalar sohasidagi vakolatli organ',
  	"legal_registrar_placeholder" boolean DEFAULT true,
  	"legal_founder_value" varchar DEFAULT '«Muassis nomi» MChJ',
  	"legal_founder_placeholder" boolean DEFAULT true,
  	"legal_editor_in_chief_value" varchar DEFAULT 'Familiya Ism Sharif',
  	"legal_editor_in_chief_placeholder" boolean DEFAULT true,
  	"legal_address_value" varchar DEFAULT '100000, Toshkent sh., tuman, koʻcha, uy',
  	"legal_address_placeholder" boolean DEFAULT true,
  	"legal_postal_index_value" varchar DEFAULT '',
  	"legal_postal_index_placeholder" boolean DEFAULT true,
  	"legal_email_value" varchar DEFAULT 'info@muomalat.uz',
  	"legal_email_placeholder" boolean DEFAULT true,
  	"legal_phone_value" varchar DEFAULT '+998 00 000-00-00',
  	"legal_phone_placeholder" boolean DEFAULT true,
  	"legal_age_mark_value" "enum_site_settings_legal_age_mark_value" DEFAULT '16+',
  	"legal_age_mark_placeholder" boolean DEFAULT true,
  	"legal_meta_last_changed_at" timestamp(3) with time zone,
  	"demo_notice_enabled" boolean DEFAULT true,
  	"telegram_channel_handle" varchar DEFAULT '@muomalatuz',
  	"telegram_channel_url" varchar DEFAULT 'https://t.me/muomalatuz',
  	"telegram_channel_chat_id" varchar,
  	"telegram_feedback_bot" varchar,
  	"telegram_posting_enabled" boolean DEFAULT false,
  	"telegram_delay_minutes" numeric DEFAULT 3 NOT NULL,
  	"policies_corrections_policy_url" varchar,
  	"policies_privacy_policy_url" varchar,
  	"policies_personal_data_officer_name" varchar,
  	"policies_personal_data_officer_email" varchar,
  	"policies_security_contact" varchar,
  	"emergency_enabled" boolean DEFAULT false,
  	"emergency_link" varchar,
  	"emergency_level" "enum_site_settings_emergency_level" DEFAULT 'info',
  	"operations_read_only" boolean DEFAULT false,
  	"operations_office_hours_start" varchar DEFAULT '09:00',
  	"operations_office_hours_end" varchar DEFAULT '19:00',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"demo_notice_text" varchar,
  	"labels_sponsored" varchar,
  	"labels_advert" varchar,
  	"emergency_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_version_telegram_invite_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"placement" "enum__site_settings_v_version_telegram_invite_links_placement" NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_alert_recipients_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_name" varchar DEFAULT 'Muomalat' NOT NULL,
  	"version_domain" varchar DEFAULT 'muomalat.uz' NOT NULL,
  	"version_email" varchar DEFAULT 'info@muomalat.uz',
  	"version_founded_year" numeric DEFAULT 2026,
  	"version_legal_registration_number_value" varchar DEFAULT '№ 0000',
  	"version_legal_registration_number_placeholder" boolean DEFAULT true,
  	"version_legal_registration_date_value" varchar DEFAULT 'KK.OO.YYYY',
  	"version_legal_registration_date_placeholder" boolean DEFAULT true,
  	"version_legal_registrar_value" varchar DEFAULT 'Ommaviy kommunikatsiyalar sohasidagi vakolatli organ',
  	"version_legal_registrar_placeholder" boolean DEFAULT true,
  	"version_legal_founder_value" varchar DEFAULT '«Muassis nomi» MChJ',
  	"version_legal_founder_placeholder" boolean DEFAULT true,
  	"version_legal_editor_in_chief_value" varchar DEFAULT 'Familiya Ism Sharif',
  	"version_legal_editor_in_chief_placeholder" boolean DEFAULT true,
  	"version_legal_address_value" varchar DEFAULT '100000, Toshkent sh., tuman, koʻcha, uy',
  	"version_legal_address_placeholder" boolean DEFAULT true,
  	"version_legal_postal_index_value" varchar DEFAULT '',
  	"version_legal_postal_index_placeholder" boolean DEFAULT true,
  	"version_legal_email_value" varchar DEFAULT 'info@muomalat.uz',
  	"version_legal_email_placeholder" boolean DEFAULT true,
  	"version_legal_phone_value" varchar DEFAULT '+998 00 000-00-00',
  	"version_legal_phone_placeholder" boolean DEFAULT true,
  	"version_legal_age_mark_value" "enum__site_settings_v_version_legal_age_mark_value" DEFAULT '16+',
  	"version_legal_age_mark_placeholder" boolean DEFAULT true,
  	"version_legal_meta_last_changed_at" timestamp(3) with time zone,
  	"version_demo_notice_enabled" boolean DEFAULT true,
  	"version_telegram_channel_handle" varchar DEFAULT '@muomalatuz',
  	"version_telegram_channel_url" varchar DEFAULT 'https://t.me/muomalatuz',
  	"version_telegram_channel_chat_id" varchar,
  	"version_telegram_feedback_bot" varchar,
  	"version_telegram_posting_enabled" boolean DEFAULT false,
  	"version_telegram_delay_minutes" numeric DEFAULT 3 NOT NULL,
  	"version_policies_corrections_policy_url" varchar,
  	"version_policies_privacy_policy_url" varchar,
  	"version_policies_personal_data_officer_name" varchar,
  	"version_policies_personal_data_officer_email" varchar,
  	"version_policies_security_contact" varchar,
  	"version_emergency_enabled" boolean DEFAULT false,
  	"version_emergency_link" varchar,
  	"version_emergency_level" "enum__site_settings_v_version_emergency_level" DEFAULT 'info',
  	"version_operations_read_only" boolean DEFAULT false,
  	"version_operations_office_hours_start" varchar DEFAULT '09:00',
  	"version_operations_office_hours_end" varchar DEFAULT '19:00',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_locales" (
  	"version_demo_notice_text" varchar,
  	"version_labels_sponsored" varchar,
  	"version_labels_advert" varchar,
  	"version_emergency_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "editorial_rules_banned_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pattern" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "editorial_rules_review_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pattern" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "editorial_rules_real_org_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "editorial_rules_house_spellings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wrong" varchar NOT NULL,
  	"right" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "editorial_rules_return_phrases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "enum_editorial_rules_return_phrases_locale" NOT NULL,
  	"pattern" varchar NOT NULL
  );
  
  CREATE TABLE "editorial_rules_source_domains" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "editorial_rules_translit_exceptions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"latin" varchar NOT NULL,
  	"cyrillic" varchar NOT NULL,
  	"soft_end" boolean
  );
  
  CREATE TABLE "editorial_rules_translit_keep" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"term" varchar NOT NULL
  );
  
  CREATE TABLE "editorial_rules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"limits_title_warn" numeric DEFAULT 80 NOT NULL,
  	"limits_title_max" numeric DEFAULT 140 NOT NULL,
  	"limits_lead_warn" numeric DEFAULT 300 NOT NULL,
  	"limits_lead_max" numeric DEFAULT 500 NOT NULL,
  	"limits_telegram_caption" numeric DEFAULT 1024 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_editorial_rules_v_version_banned_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pattern" varchar NOT NULL,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_v_version_review_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pattern" varchar NOT NULL,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_v_version_real_org_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_v_version_house_spellings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"wrong" varchar NOT NULL,
  	"right" varchar NOT NULL,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_return_phrases_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"locale" "enum__editorial_rules_return_phrases_v_locale" NOT NULL,
  	"pattern" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_source_domains_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_v_version_translit_exceptions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"latin" varchar NOT NULL,
  	"cyrillic" varchar NOT NULL,
  	"soft_end" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_v_version_translit_keep" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"term" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_rules_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_limits_title_warn" numeric DEFAULT 80 NOT NULL,
  	"version_limits_title_max" numeric DEFAULT 140 NOT NULL,
  	"version_limits_lead_warn" numeric DEFAULT 300 NOT NULL,
  	"version_limits_lead_max" numeric DEFAULT 500 NOT NULL,
  	"version_limits_telegram_caption" numeric DEFAULT 1024 NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "telegram_user_id" varchar;
  ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "last_login_country" varchar;
  ALTER TABLE "users" ADD COLUMN "known_countries" jsonb;
  ALTER TABLE "media" ADD COLUMN "creator" varchar;
  ALTER TABLE "media" ADD COLUMN "rights_category" "enum_media_rights_category" DEFAULT 'unknown' NOT NULL;
  ALTER TABLE "media" ADD COLUMN "licence_url" varchar;
  ALTER TABLE "media" ADD COLUMN "copyright_notice" varchar;
  ALTER TABLE "media" ADD COLUMN "usable_until" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN "restrictions" varchar;
  ALTER TABLE "media" ADD COLUMN "evidence" varchar;
  ALTER TABLE "media" ADD COLUMN "sponsored_only" boolean;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "authors_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rubrics_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tags_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "glossary_terms_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "institutions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "milestones_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "club_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "telegram_posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "club_applications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "digest_subscribers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "advertising_requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "articles_sources" ADD CONSTRAINT "articles_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_workflow_history" ADD CONSTRAINT "articles_workflow_history_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_workflow_history" ADD CONSTRAINT "articles_workflow_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_corrections" ADD CONSTRAINT "articles_corrections_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_corrections" ADD CONSTRAINT "articles_corrections_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_corrections" ADD CONSTRAINT "articles_corrections_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_corrections" ADD CONSTRAINT "articles_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_corrections_locales" ADD CONSTRAINT "articles_corrections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles_corrections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_slug_history" ADD CONSTRAINT "articles_slug_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_desk_editor_id_users_id_fk" FOREIGN KEY ("desk_editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_about_id_institutions_id_fk" FOREIGN KEY ("about_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_interviewee_portrait_id_media_id_fk" FOREIGN KEY ("interviewee_portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_scheduled_by_id_users_id_fk" FOREIGN KEY ("scheduled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_second_read_done_by_id_users_id_fk" FOREIGN KEY ("second_read_done_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_withdrawal_by_id_users_id_fk" FOREIGN KEY ("withdrawal_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_withdrawal_request_id_requests_id_fk" FOREIGN KEY ("withdrawal_request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_sponsored_approved_by_id_users_id_fk" FOREIGN KEY ("sponsored_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_kr_checked_by_id_users_id_fk" FOREIGN KEY ("kr_checked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_legal_sign_off_by_id_users_id_fk" FOREIGN KEY ("legal_sign_off_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_translation_assignee_id_users_id_fk" FOREIGN KEY ("translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_translation_translated_by_id_users_id_fk" FOREIGN KEY ("translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_institutions_fk" FOREIGN KEY ("institutions_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_sources" ADD CONSTRAINT "_articles_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_workflow_history" ADD CONSTRAINT "_articles_v_version_workflow_history_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_workflow_history" ADD CONSTRAINT "_articles_v_version_workflow_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_corrections_locales" ADD CONSTRAINT "_articles_v_version_corrections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v_version_corrections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_slug_history" ADD CONSTRAINT "_articles_v_version_slug_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_rubric_id_rubrics_id_fk" FOREIGN KEY ("version_rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_assignee_id_users_id_fk" FOREIGN KEY ("version_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_desk_editor_id_users_id_fk" FOREIGN KEY ("version_desk_editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_about_id_institutions_id_fk" FOREIGN KEY ("version_about_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_interviewee_portrait_id_media_id_fk" FOREIGN KEY ("version_interviewee_portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_submitted_by_id_users_id_fk" FOREIGN KEY ("version_submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_approved_by_id_users_id_fk" FOREIGN KEY ("version_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_scheduled_by_id_users_id_fk" FOREIGN KEY ("version_scheduled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_second_read_done_by_id_users_id_fk" FOREIGN KEY ("version_second_read_done_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_withdrawal_by_id_users_id_fk" FOREIGN KEY ("version_withdrawal_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_withdrawal_request_id_requests_id_fk" FOREIGN KEY ("version_withdrawal_request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_sponsored_approved_by_id_users_id_fk" FOREIGN KEY ("version_sponsored_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_kr_checked_by_id_users_id_fk" FOREIGN KEY ("version_kr_checked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_legal_sign_off_by_id_users_id_fk" FOREIGN KEY ("version_legal_sign_off_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_supervisor_id_users_id_fk" FOREIGN KEY ("version_supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_version_translation_assignee_id_users_id_fk" FOREIGN KEY ("version_translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_version_translation_translated_by_id_users_id_fk" FOREIGN KEY ("version_translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_version_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_institutions_fk" FOREIGN KEY ("institutions_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "authors" ADD CONSTRAINT "authors_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "authors" ADD CONSTRAINT "authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "authors" ADD CONSTRAINT "authors_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "authors_locales" ADD CONSTRAINT "authors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_authors_v" ADD CONSTRAINT "_authors_v_parent_id_authors_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_authors_v" ADD CONSTRAINT "_authors_v_version_portrait_id_media_id_fk" FOREIGN KEY ("version_portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_authors_v" ADD CONSTRAINT "_authors_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_authors_v" ADD CONSTRAINT "_authors_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_authors_v_locales" ADD CONSTRAINT "_authors_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_authors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rubrics_locales" ADD CONSTRAINT "rubrics_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rubrics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rubrics_v" ADD CONSTRAINT "_rubrics_v_parent_id_rubrics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rubrics_v" ADD CONSTRAINT "_rubrics_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rubrics_v_locales" ADD CONSTRAINT "_rubrics_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_rubrics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags_locales" ADD CONSTRAINT "tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v_locales" ADD CONSTRAINT "_tags_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tags_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glossary_terms_steps" ADD CONSTRAINT "glossary_terms_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glossary_terms_locales" ADD CONSTRAINT "glossary_terms_locales_translation_assignee_id_users_id_fk" FOREIGN KEY ("translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glossary_terms_locales" ADD CONSTRAINT "glossary_terms_locales_translation_translated_by_id_users_id_fk" FOREIGN KEY ("translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glossary_terms_locales" ADD CONSTRAINT "glossary_terms_locales_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glossary_terms_locales" ADD CONSTRAINT "glossary_terms_locales_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glossary_terms_locales" ADD CONSTRAINT "glossary_terms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glossary_terms_texts" ADD CONSTRAINT "glossary_terms_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glossary_terms_rels" ADD CONSTRAINT "glossary_terms_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glossary_terms_rels" ADD CONSTRAINT "glossary_terms_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_version_steps" ADD CONSTRAINT "_glossary_terms_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glossary_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v" ADD CONSTRAINT "_glossary_terms_v_parent_id_glossary_terms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."glossary_terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v" ADD CONSTRAINT "_glossary_terms_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_locales" ADD CONSTRAINT "_glossary_terms_v_locales_version_translation_assignee_id_users_id_fk" FOREIGN KEY ("version_translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_locales" ADD CONSTRAINT "_glossary_terms_v_locales_version_translation_translated_by_id_users_id_fk" FOREIGN KEY ("version_translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_locales" ADD CONSTRAINT "_glossary_terms_v_locales_version_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_locales" ADD CONSTRAINT "_glossary_terms_v_locales_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_locales" ADD CONSTRAINT "_glossary_terms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glossary_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_texts" ADD CONSTRAINT "_glossary_terms_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_glossary_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_rels" ADD CONSTRAINT "_glossary_terms_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_glossary_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glossary_terms_v_rels" ADD CONSTRAINT "_glossary_terms_v_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institutions_status_history" ADD CONSTRAINT "institutions_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institutions" ADD CONSTRAINT "institutions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institutions" ADD CONSTRAINT "institutions_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institutions_locales" ADD CONSTRAINT "institutions_locales_translation_assignee_id_users_id_fk" FOREIGN KEY ("translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institutions_locales" ADD CONSTRAINT "institutions_locales_translation_translated_by_id_users_id_fk" FOREIGN KEY ("translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institutions_locales" ADD CONSTRAINT "institutions_locales_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institutions_locales" ADD CONSTRAINT "institutions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institutions_texts" ADD CONSTRAINT "institutions_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institutions_v_version_status_history" ADD CONSTRAINT "_institutions_v_version_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_institutions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institutions_v" ADD CONSTRAINT "_institutions_v_parent_id_institutions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institutions_v" ADD CONSTRAINT "_institutions_v_version_article_id_articles_id_fk" FOREIGN KEY ("version_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institutions_v" ADD CONSTRAINT "_institutions_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institutions_v_locales" ADD CONSTRAINT "_institutions_v_locales_version_translation_assignee_id_users_id_fk" FOREIGN KEY ("version_translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institutions_v_locales" ADD CONSTRAINT "_institutions_v_locales_version_translation_translated_by_id_users_id_fk" FOREIGN KEY ("version_translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institutions_v_locales" ADD CONSTRAINT "_institutions_v_locales_version_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institutions_v_locales" ADD CONSTRAINT "_institutions_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_institutions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institutions_v_texts" ADD CONSTRAINT "_institutions_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_institutions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "milestones" ADD CONSTRAINT "milestones_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones" ADD CONSTRAINT "milestones_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones_locales" ADD CONSTRAINT "milestones_locales_translation_assignee_id_users_id_fk" FOREIGN KEY ("translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones_locales" ADD CONSTRAINT "milestones_locales_translation_translated_by_id_users_id_fk" FOREIGN KEY ("translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones_locales" ADD CONSTRAINT "milestones_locales_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones_locales" ADD CONSTRAINT "milestones_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_milestones_v" ADD CONSTRAINT "_milestones_v_parent_id_milestones_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_milestones_v" ADD CONSTRAINT "_milestones_v_version_article_id_articles_id_fk" FOREIGN KEY ("version_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_milestones_v" ADD CONSTRAINT "_milestones_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_milestones_v_locales" ADD CONSTRAINT "_milestones_v_locales_version_translation_assignee_id_users_id_fk" FOREIGN KEY ("version_translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_milestones_v_locales" ADD CONSTRAINT "_milestones_v_locales_version_translation_translated_by_id_users_id_fk" FOREIGN KEY ("version_translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_milestones_v_locales" ADD CONSTRAINT "_milestones_v_locales_version_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_milestones_v_locales" ADD CONSTRAINT "_milestones_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_milestones_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "club_events_agenda" ADD CONSTRAINT "club_events_agenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "club_events_agenda_locales" ADD CONSTRAINT "club_events_agenda_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."club_events_agenda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "club_events_speakers" ADD CONSTRAINT "club_events_speakers_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events_speakers" ADD CONSTRAINT "club_events_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "club_events_takeaways" ADD CONSTRAINT "club_events_takeaways_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "club_events" ADD CONSTRAINT "club_events_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events" ADD CONSTRAINT "club_events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events_locales" ADD CONSTRAINT "club_events_locales_translation_assignee_id_users_id_fk" FOREIGN KEY ("translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events_locales" ADD CONSTRAINT "club_events_locales_translation_translated_by_id_users_id_fk" FOREIGN KEY ("translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events_locales" ADD CONSTRAINT "club_events_locales_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events_locales" ADD CONSTRAINT "club_events_locales_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_events_locales" ADD CONSTRAINT "club_events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_club_events_v_version_agenda" ADD CONSTRAINT "_club_events_v_version_agenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_club_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_club_events_v_version_agenda_locales" ADD CONSTRAINT "_club_events_v_version_agenda_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_club_events_v_version_agenda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_club_events_v_version_speakers" ADD CONSTRAINT "_club_events_v_version_speakers_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v_version_speakers" ADD CONSTRAINT "_club_events_v_version_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_club_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_club_events_v_version_takeaways" ADD CONSTRAINT "_club_events_v_version_takeaways_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_club_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_club_events_v" ADD CONSTRAINT "_club_events_v_parent_id_club_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."club_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v" ADD CONSTRAINT "_club_events_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v" ADD CONSTRAINT "_club_events_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v_locales" ADD CONSTRAINT "_club_events_v_locales_version_translation_assignee_id_users_id_fk" FOREIGN KEY ("version_translation_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v_locales" ADD CONSTRAINT "_club_events_v_locales_version_translation_translated_by_id_users_id_fk" FOREIGN KEY ("version_translation_translated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v_locales" ADD CONSTRAINT "_club_events_v_locales_version_translation_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_translation_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v_locales" ADD CONSTRAINT "_club_events_v_locales_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_club_events_v_locales" ADD CONSTRAINT "_club_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_club_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "requests" ADD CONSTRAINT "requests_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "requests" ADD CONSTRAINT "requests_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "requests" ADD CONSTRAINT "requests_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "telegram_posts_history" ADD CONSTRAINT "telegram_posts_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."telegram_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_applications_interests" ADD CONSTRAINT "club_applications_interests_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."club_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_event_id_club_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."club_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "digest_subscribers" ADD CONSTRAINT "digest_subscribers_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "advertising_requests" ADD CONSTRAINT "advertising_requests_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_declared_interests" ADD CONSTRAINT "users_declared_interests_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_declared_interests" ADD CONSTRAINT "users_declared_interests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_club_events_fk" FOREIGN KEY ("club_events_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_query_presets_rels" ADD CONSTRAINT "payload_query_presets_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_query_presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_query_presets_rels" ADD CONSTRAINT "payload_query_presets_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_pinned" ADD CONSTRAINT "home_page_pinned_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_pinned" ADD CONSTRAINT "home_page_pinned_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_lead_id_articles_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_breaking_article_id_articles_id_fk" FOREIGN KEY ("breaking_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_interview_feature_id_articles_id_fk" FOREIGN KEY ("interview_feature_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_sponsored_teaser_id_articles_id_fk" FOREIGN KEY ("sponsored_teaser_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_launched_by_id_users_id_fk" FOREIGN KEY ("launched_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_locales" ADD CONSTRAINT "home_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_pinned" ADD CONSTRAINT "_home_page_v_version_pinned_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_pinned" ADD CONSTRAINT "_home_page_v_version_pinned_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_lead_id_articles_id_fk" FOREIGN KEY ("version_lead_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_breaking_article_id_articles_id_fk" FOREIGN KEY ("version_breaking_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_interview_feature_id_articles_id_fk" FOREIGN KEY ("version_interview_feature_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_sponsored_teaser_id_articles_id_fk" FOREIGN KEY ("version_sponsored_teaser_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_launched_by_id_users_id_fk" FOREIGN KEY ("version_launched_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_locales" ADD CONSTRAINT "_home_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header" ADD CONSTRAINT "navigation_header_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_header" ADD CONSTRAINT "navigation_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header_locales" ADD CONSTRAINT "navigation_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_items" ADD CONSTRAINT "navigation_footer_items_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_footer_items" ADD CONSTRAINT "navigation_footer_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_items_locales" ADD CONSTRAINT "navigation_footer_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer" ADD CONSTRAINT "navigation_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_locales" ADD CONSTRAINT "navigation_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header" ADD CONSTRAINT "_navigation_v_version_header_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header" ADD CONSTRAINT "_navigation_v_version_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header_locales" ADD CONSTRAINT "_navigation_v_version_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_items" ADD CONSTRAINT "_navigation_v_version_footer_items_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_items" ADD CONSTRAINT "_navigation_v_version_footer_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_items_locales" ADD CONSTRAINT "_navigation_v_version_footer_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_footer_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer" ADD CONSTRAINT "_navigation_v_version_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_locales" ADD CONSTRAINT "_navigation_v_version_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ad_slots_slots" ADD CONSTRAINT "ad_slots_slots_creative_id_media_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_slots_slots" ADD CONSTRAINT "ad_slots_slots_creative_uz_id_media_id_fk" FOREIGN KEY ("creative_uz_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_slots_slots" ADD CONSTRAINT "ad_slots_slots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ad_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ad_slots_slots_locales" ADD CONSTRAINT "ad_slots_slots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ad_slots_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ad_slots_v_version_slots" ADD CONSTRAINT "_ad_slots_v_version_slots_creative_id_media_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ad_slots_v_version_slots" ADD CONSTRAINT "_ad_slots_v_version_slots_creative_uz_id_media_id_fk" FOREIGN KEY ("creative_uz_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ad_slots_v_version_slots" ADD CONSTRAINT "_ad_slots_v_version_slots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ad_slots_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ad_slots_v_version_slots_locales" ADD CONSTRAINT "_ad_slots_v_version_slots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ad_slots_v_version_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_telegram_invite_links" ADD CONSTRAINT "site_settings_telegram_invite_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_alert_recipients" ADD CONSTRAINT "site_settings_alert_recipients_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_telegram_invite_links" ADD CONSTRAINT "_site_settings_v_version_telegram_invite_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_alert_recipients_v" ADD CONSTRAINT "_site_settings_alert_recipients_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_banned_terms" ADD CONSTRAINT "editorial_rules_banned_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_review_terms" ADD CONSTRAINT "editorial_rules_review_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_real_org_names" ADD CONSTRAINT "editorial_rules_real_org_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_house_spellings" ADD CONSTRAINT "editorial_rules_house_spellings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_return_phrases" ADD CONSTRAINT "editorial_rules_return_phrases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_source_domains" ADD CONSTRAINT "editorial_rules_source_domains_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_translit_exceptions" ADD CONSTRAINT "editorial_rules_translit_exceptions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_rules_translit_keep" ADD CONSTRAINT "editorial_rules_translit_keep_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_v_version_banned_terms" ADD CONSTRAINT "_editorial_rules_v_version_banned_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_v_version_review_terms" ADD CONSTRAINT "_editorial_rules_v_version_review_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_v_version_real_org_names" ADD CONSTRAINT "_editorial_rules_v_version_real_org_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_v_version_house_spellings" ADD CONSTRAINT "_editorial_rules_v_version_house_spellings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_return_phrases_v" ADD CONSTRAINT "_editorial_rules_return_phrases_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_source_domains_v" ADD CONSTRAINT "_editorial_rules_source_domains_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_v_version_translit_exceptions" ADD CONSTRAINT "_editorial_rules_v_version_translit_exceptions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_rules_v_version_translit_keep" ADD CONSTRAINT "_editorial_rules_v_version_translit_keep_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_rules_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_sources_order_idx" ON "articles_sources" USING btree ("_order");
  CREATE INDEX "articles_sources_parent_id_idx" ON "articles_sources" USING btree ("_parent_id");
  CREATE INDEX "articles_workflow_history_order_idx" ON "articles_workflow_history" USING btree ("_order");
  CREATE INDEX "articles_workflow_history_parent_id_idx" ON "articles_workflow_history" USING btree ("_parent_id");
  CREATE INDEX "articles_workflow_history_by_idx" ON "articles_workflow_history" USING btree ("by_id");
  CREATE INDEX "articles_corrections_order_idx" ON "articles_corrections" USING btree ("_order");
  CREATE INDEX "articles_corrections_parent_id_idx" ON "articles_corrections" USING btree ("_parent_id");
  CREATE INDEX "articles_corrections_created_by_idx" ON "articles_corrections" USING btree ("created_by_id");
  CREATE INDEX "articles_corrections_approved_by_idx" ON "articles_corrections" USING btree ("approved_by_id");
  CREATE INDEX "articles_corrections_request_idx" ON "articles_corrections" USING btree ("request_id");
  CREATE UNIQUE INDEX "articles_corrections_locales_locale_parent_id_unique" ON "articles_corrections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_slug_history_order_idx" ON "articles_slug_history" USING btree ("_order");
  CREATE INDEX "articles_slug_history_parent_id_idx" ON "articles_slug_history" USING btree ("_parent_id");
  CREATE INDEX "articles_rubric_idx" ON "articles" USING btree ("rubric_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_workflow_status_idx" ON "articles" USING btree ("workflow_status");
  CREATE INDEX "articles_assignee_idx" ON "articles" USING btree ("assignee_id");
  CREATE INDEX "articles_desk_editor_idx" ON "articles" USING btree ("desk_editor_id");
  CREATE INDEX "articles_last_edited_by_idx" ON "articles" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "articles_legacy_id_idx" ON "articles" USING btree ("legacy_id");
  CREATE INDEX "articles_image_idx" ON "articles" USING btree ("image_id");
  CREATE INDEX "articles_about_idx" ON "articles" USING btree ("about_id");
  CREATE INDEX "articles_interviewee_interviewee_portrait_idx" ON "articles" USING btree ("interviewee_portrait_id");
  CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");
  CREATE INDEX "articles_first_published_at_idx" ON "articles" USING btree ("first_published_at");
  CREATE INDEX "articles_submitted_by_idx" ON "articles" USING btree ("submitted_by_id");
  CREATE INDEX "articles_approved_by_idx" ON "articles" USING btree ("approved_by_id");
  CREATE INDEX "articles_published_by_idx" ON "articles" USING btree ("published_by_id");
  CREATE INDEX "articles_scheduled_by_idx" ON "articles" USING btree ("scheduled_by_id");
  CREATE INDEX "articles_second_read_second_read_done_by_idx" ON "articles" USING btree ("second_read_done_by_id");
  CREATE INDEX "articles_withdrawal_withdrawal_by_idx" ON "articles" USING btree ("withdrawal_by_id");
  CREATE INDEX "articles_withdrawal_withdrawal_request_idx" ON "articles" USING btree ("withdrawal_request_id");
  CREATE INDEX "articles_sponsored_sponsored_enabled_idx" ON "articles" USING btree ("sponsored_enabled");
  CREATE INDEX "articles_sponsored_sponsored_approved_by_idx" ON "articles" USING btree ("sponsored_approved_by_id");
  CREATE INDEX "articles_kr_kr_checked_by_idx" ON "articles" USING btree ("kr_checked_by_id");
  CREATE UNIQUE INDEX "articles_short_code_idx" ON "articles" USING btree ("short_code");
  CREATE INDEX "articles_legal_sign_off_legal_sign_off_by_idx" ON "articles" USING btree ("legal_sign_off_by_id");
  CREATE INDEX "articles_supervisor_idx" ON "articles" USING btree ("supervisor_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles_deleted_at_idx" ON "articles" USING btree ("deleted_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_translation_translation_assignee_idx" ON "articles_locales" USING btree ("translation_assignee_id");
  CREATE INDEX "articles_translation_translation_translated_by_idx" ON "articles_locales" USING btree ("translation_translated_by_id");
  CREATE INDEX "articles_translation_translation_reviewed_by_idx" ON "articles_locales" USING btree ("translation_reviewed_by_id");
  CREATE INDEX "articles_meta_meta_image_idx" ON "articles_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_authors_id_idx" ON "articles_rels" USING btree ("authors_id");
  CREATE INDEX "articles_rels_tags_id_idx" ON "articles_rels" USING btree ("tags_id");
  CREATE INDEX "articles_rels_glossary_terms_id_idx" ON "articles_rels" USING btree ("glossary_terms_id");
  CREATE INDEX "articles_rels_institutions_id_idx" ON "articles_rels" USING btree ("institutions_id");
  CREATE INDEX "articles_rels_articles_id_idx" ON "articles_rels" USING btree ("articles_id");
  CREATE INDEX "articles_rels_users_id_idx" ON "articles_rels" USING btree ("users_id");
  CREATE INDEX "articles_rels_media_id_idx" ON "articles_rels" USING btree ("media_id");
  CREATE INDEX "_articles_v_version_sources_order_idx" ON "_articles_v_version_sources" USING btree ("_order");
  CREATE INDEX "_articles_v_version_sources_parent_id_idx" ON "_articles_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_workflow_history_order_idx" ON "_articles_v_version_workflow_history" USING btree ("_order");
  CREATE INDEX "_articles_v_version_workflow_history_parent_id_idx" ON "_articles_v_version_workflow_history" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_workflow_history_by_idx" ON "_articles_v_version_workflow_history" USING btree ("by_id");
  CREATE INDEX "_articles_v_version_corrections_order_idx" ON "_articles_v_version_corrections" USING btree ("_order");
  CREATE INDEX "_articles_v_version_corrections_parent_id_idx" ON "_articles_v_version_corrections" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_corrections_created_by_idx" ON "_articles_v_version_corrections" USING btree ("created_by_id");
  CREATE INDEX "_articles_v_version_corrections_approved_by_idx" ON "_articles_v_version_corrections" USING btree ("approved_by_id");
  CREATE INDEX "_articles_v_version_corrections_request_idx" ON "_articles_v_version_corrections" USING btree ("request_id");
  CREATE UNIQUE INDEX "_articles_v_version_corrections_locales_locale_parent_id_uni" ON "_articles_v_version_corrections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_version_slug_history_order_idx" ON "_articles_v_version_slug_history" USING btree ("_order");
  CREATE INDEX "_articles_v_version_slug_history_parent_id_idx" ON "_articles_v_version_slug_history" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_rubric_idx" ON "_articles_v" USING btree ("version_rubric_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_workflow_status_idx" ON "_articles_v" USING btree ("version_workflow_status");
  CREATE INDEX "_articles_v_version_version_assignee_idx" ON "_articles_v" USING btree ("version_assignee_id");
  CREATE INDEX "_articles_v_version_version_desk_editor_idx" ON "_articles_v" USING btree ("version_desk_editor_id");
  CREATE INDEX "_articles_v_version_version_last_edited_by_idx" ON "_articles_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_articles_v_version_version_legacy_id_idx" ON "_articles_v" USING btree ("version_legacy_id");
  CREATE INDEX "_articles_v_version_version_image_idx" ON "_articles_v" USING btree ("version_image_id");
  CREATE INDEX "_articles_v_version_version_about_idx" ON "_articles_v" USING btree ("version_about_id");
  CREATE INDEX "_articles_v_version_interviewee_version_interviewee_port_idx" ON "_articles_v" USING btree ("version_interviewee_portrait_id");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "_articles_v" USING btree ("version_published_at");
  CREATE INDEX "_articles_v_version_version_first_published_at_idx" ON "_articles_v" USING btree ("version_first_published_at");
  CREATE INDEX "_articles_v_version_version_submitted_by_idx" ON "_articles_v" USING btree ("version_submitted_by_id");
  CREATE INDEX "_articles_v_version_version_approved_by_idx" ON "_articles_v" USING btree ("version_approved_by_id");
  CREATE INDEX "_articles_v_version_version_published_by_idx" ON "_articles_v" USING btree ("version_published_by_id");
  CREATE INDEX "_articles_v_version_version_scheduled_by_idx" ON "_articles_v" USING btree ("version_scheduled_by_id");
  CREATE INDEX "_articles_v_version_second_read_version_second_read_done_idx" ON "_articles_v" USING btree ("version_second_read_done_by_id");
  CREATE INDEX "_articles_v_version_withdrawal_version_withdrawal_by_idx" ON "_articles_v" USING btree ("version_withdrawal_by_id");
  CREATE INDEX "_articles_v_version_withdrawal_version_withdrawal_reques_idx" ON "_articles_v" USING btree ("version_withdrawal_request_id");
  CREATE INDEX "_articles_v_version_sponsored_version_sponsored_enabled_idx" ON "_articles_v" USING btree ("version_sponsored_enabled");
  CREATE INDEX "_articles_v_version_sponsored_version_sponsored_approved_idx" ON "_articles_v" USING btree ("version_sponsored_approved_by_id");
  CREATE INDEX "_articles_v_version_kr_version_kr_checked_by_idx" ON "_articles_v" USING btree ("version_kr_checked_by_id");
  CREATE INDEX "_articles_v_version_version_short_code_idx" ON "_articles_v" USING btree ("version_short_code");
  CREATE INDEX "_articles_v_version_legal_sign_off_version_legal_sign_of_idx" ON "_articles_v" USING btree ("version_legal_sign_off_by_id");
  CREATE INDEX "_articles_v_version_version_supervisor_idx" ON "_articles_v" USING btree ("version_supervisor_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version_deleted_at_idx" ON "_articles_v" USING btree ("version_deleted_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "_articles_v" USING btree ("autosave");
  CREATE INDEX "_articles_v_version_translation_version_translation_assi_idx" ON "_articles_v_locales" USING btree ("version_translation_assignee_id");
  CREATE INDEX "_articles_v_version_translation_version_translation_tran_idx" ON "_articles_v_locales" USING btree ("version_translation_translated_by_id");
  CREATE INDEX "_articles_v_version_translation_version_translation_revi_idx" ON "_articles_v_locales" USING btree ("version_translation_reviewed_by_id");
  CREATE INDEX "_articles_v_version_meta_version_meta_image_idx" ON "_articles_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_authors_id_idx" ON "_articles_v_rels" USING btree ("authors_id");
  CREATE INDEX "_articles_v_rels_tags_id_idx" ON "_articles_v_rels" USING btree ("tags_id");
  CREATE INDEX "_articles_v_rels_glossary_terms_id_idx" ON "_articles_v_rels" USING btree ("glossary_terms_id");
  CREATE INDEX "_articles_v_rels_institutions_id_idx" ON "_articles_v_rels" USING btree ("institutions_id");
  CREATE INDEX "_articles_v_rels_articles_id_idx" ON "_articles_v_rels" USING btree ("articles_id");
  CREATE INDEX "_articles_v_rels_users_id_idx" ON "_articles_v_rels" USING btree ("users_id");
  CREATE INDEX "_articles_v_rels_media_id_idx" ON "_articles_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "authors_slug_idx" ON "authors" USING btree ("slug");
  CREATE INDEX "authors_portrait_idx" ON "authors" USING btree ("portrait_id");
  CREATE UNIQUE INDEX "authors_user_idx" ON "authors" USING btree ("user_id");
  CREATE INDEX "authors_last_edited_by_idx" ON "authors" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "authors_legacy_id_idx" ON "authors" USING btree ("legacy_id");
  CREATE INDEX "authors_updated_at_idx" ON "authors" USING btree ("updated_at");
  CREATE INDEX "authors_created_at_idx" ON "authors" USING btree ("created_at");
  CREATE INDEX "authors__status_idx" ON "authors" USING btree ("_status");
  CREATE UNIQUE INDEX "authors_locales_locale_parent_id_unique" ON "authors_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_authors_v_parent_idx" ON "_authors_v" USING btree ("parent_id");
  CREATE INDEX "_authors_v_version_version_slug_idx" ON "_authors_v" USING btree ("version_slug");
  CREATE INDEX "_authors_v_version_version_portrait_idx" ON "_authors_v" USING btree ("version_portrait_id");
  CREATE INDEX "_authors_v_version_version_user_idx" ON "_authors_v" USING btree ("version_user_id");
  CREATE INDEX "_authors_v_version_version_last_edited_by_idx" ON "_authors_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_authors_v_version_version_legacy_id_idx" ON "_authors_v" USING btree ("version_legacy_id");
  CREATE INDEX "_authors_v_version_version_updated_at_idx" ON "_authors_v" USING btree ("version_updated_at");
  CREATE INDEX "_authors_v_version_version_created_at_idx" ON "_authors_v" USING btree ("version_created_at");
  CREATE INDEX "_authors_v_version_version__status_idx" ON "_authors_v" USING btree ("version__status");
  CREATE INDEX "_authors_v_created_at_idx" ON "_authors_v" USING btree ("created_at");
  CREATE INDEX "_authors_v_updated_at_idx" ON "_authors_v" USING btree ("updated_at");
  CREATE INDEX "_authors_v_snapshot_idx" ON "_authors_v" USING btree ("snapshot");
  CREATE INDEX "_authors_v_published_locale_idx" ON "_authors_v" USING btree ("published_locale");
  CREATE INDEX "_authors_v_latest_idx" ON "_authors_v" USING btree ("latest");
  CREATE INDEX "_authors_v_autosave_idx" ON "_authors_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_authors_v_locales_locale_parent_id_unique" ON "_authors_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "rubrics_slug_idx" ON "rubrics" USING btree ("slug");
  CREATE INDEX "rubrics_last_edited_by_idx" ON "rubrics" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "rubrics_legacy_id_idx" ON "rubrics" USING btree ("legacy_id");
  CREATE INDEX "rubrics_updated_at_idx" ON "rubrics" USING btree ("updated_at");
  CREATE INDEX "rubrics_created_at_idx" ON "rubrics" USING btree ("created_at");
  CREATE INDEX "rubrics__status_idx" ON "rubrics" USING btree ("_status");
  CREATE UNIQUE INDEX "rubrics_locales_locale_parent_id_unique" ON "rubrics_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_rubrics_v_parent_idx" ON "_rubrics_v" USING btree ("parent_id");
  CREATE INDEX "_rubrics_v_version_version_slug_idx" ON "_rubrics_v" USING btree ("version_slug");
  CREATE INDEX "_rubrics_v_version_version_last_edited_by_idx" ON "_rubrics_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_rubrics_v_version_version_legacy_id_idx" ON "_rubrics_v" USING btree ("version_legacy_id");
  CREATE INDEX "_rubrics_v_version_version_updated_at_idx" ON "_rubrics_v" USING btree ("version_updated_at");
  CREATE INDEX "_rubrics_v_version_version_created_at_idx" ON "_rubrics_v" USING btree ("version_created_at");
  CREATE INDEX "_rubrics_v_version_version__status_idx" ON "_rubrics_v" USING btree ("version__status");
  CREATE INDEX "_rubrics_v_created_at_idx" ON "_rubrics_v" USING btree ("created_at");
  CREATE INDEX "_rubrics_v_updated_at_idx" ON "_rubrics_v" USING btree ("updated_at");
  CREATE INDEX "_rubrics_v_snapshot_idx" ON "_rubrics_v" USING btree ("snapshot");
  CREATE INDEX "_rubrics_v_published_locale_idx" ON "_rubrics_v" USING btree ("published_locale");
  CREATE INDEX "_rubrics_v_latest_idx" ON "_rubrics_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_rubrics_v_locales_locale_parent_id_unique" ON "_rubrics_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_last_edited_by_idx" ON "tags" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "tags_legacy_id_idx" ON "tags" USING btree ("legacy_id");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "tags__status_idx" ON "tags" USING btree ("_status");
  CREATE UNIQUE INDEX "tags_locales_locale_parent_id_unique" ON "tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tags_v_parent_idx" ON "_tags_v" USING btree ("parent_id");
  CREATE INDEX "_tags_v_version_version_slug_idx" ON "_tags_v" USING btree ("version_slug");
  CREATE INDEX "_tags_v_version_version_last_edited_by_idx" ON "_tags_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_tags_v_version_version_legacy_id_idx" ON "_tags_v" USING btree ("version_legacy_id");
  CREATE INDEX "_tags_v_version_version_updated_at_idx" ON "_tags_v" USING btree ("version_updated_at");
  CREATE INDEX "_tags_v_version_version_created_at_idx" ON "_tags_v" USING btree ("version_created_at");
  CREATE INDEX "_tags_v_version_version__status_idx" ON "_tags_v" USING btree ("version__status");
  CREATE INDEX "_tags_v_created_at_idx" ON "_tags_v" USING btree ("created_at");
  CREATE INDEX "_tags_v_updated_at_idx" ON "_tags_v" USING btree ("updated_at");
  CREATE INDEX "_tags_v_snapshot_idx" ON "_tags_v" USING btree ("snapshot");
  CREATE INDEX "_tags_v_published_locale_idx" ON "_tags_v" USING btree ("published_locale");
  CREATE INDEX "_tags_v_latest_idx" ON "_tags_v" USING btree ("latest");
  CREATE INDEX "_tags_v_autosave_idx" ON "_tags_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_tags_v_locales_locale_parent_id_unique" ON "_tags_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "glossary_terms_steps_order_idx" ON "glossary_terms_steps" USING btree ("_order");
  CREATE INDEX "glossary_terms_steps_parent_id_idx" ON "glossary_terms_steps" USING btree ("_parent_id");
  CREATE INDEX "glossary_terms_steps_locale_idx" ON "glossary_terms_steps" USING btree ("_locale");
  CREATE UNIQUE INDEX "glossary_terms_slug_idx" ON "glossary_terms" USING btree ("slug");
  CREATE INDEX "glossary_terms_last_edited_by_idx" ON "glossary_terms" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "glossary_terms_legacy_id_idx" ON "glossary_terms" USING btree ("legacy_id");
  CREATE INDEX "glossary_terms_updated_at_idx" ON "glossary_terms" USING btree ("updated_at");
  CREATE INDEX "glossary_terms_created_at_idx" ON "glossary_terms" USING btree ("created_at");
  CREATE INDEX "glossary_terms__status_idx" ON "glossary_terms" USING btree ("_status");
  CREATE INDEX "glossary_terms_translation_translation_assignee_idx" ON "glossary_terms_locales" USING btree ("translation_assignee_id");
  CREATE INDEX "glossary_terms_translation_translation_translated_by_idx" ON "glossary_terms_locales" USING btree ("translation_translated_by_id");
  CREATE INDEX "glossary_terms_translation_translation_reviewed_by_idx" ON "glossary_terms_locales" USING btree ("translation_reviewed_by_id");
  CREATE INDEX "glossary_terms_seo_seo_image_idx" ON "glossary_terms_locales" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "glossary_terms_locales_locale_parent_id_unique" ON "glossary_terms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "glossary_terms_texts_order_parent" ON "glossary_terms_texts" USING btree ("order","parent_id");
  CREATE INDEX "glossary_terms_rels_order_idx" ON "glossary_terms_rels" USING btree ("order");
  CREATE INDEX "glossary_terms_rels_parent_idx" ON "glossary_terms_rels" USING btree ("parent_id");
  CREATE INDEX "glossary_terms_rels_path_idx" ON "glossary_terms_rels" USING btree ("path");
  CREATE INDEX "glossary_terms_rels_glossary_terms_id_idx" ON "glossary_terms_rels" USING btree ("glossary_terms_id");
  CREATE INDEX "_glossary_terms_v_version_steps_order_idx" ON "_glossary_terms_v_version_steps" USING btree ("_order");
  CREATE INDEX "_glossary_terms_v_version_steps_parent_id_idx" ON "_glossary_terms_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_glossary_terms_v_version_steps_locale_idx" ON "_glossary_terms_v_version_steps" USING btree ("_locale");
  CREATE INDEX "_glossary_terms_v_parent_idx" ON "_glossary_terms_v" USING btree ("parent_id");
  CREATE INDEX "_glossary_terms_v_version_version_slug_idx" ON "_glossary_terms_v" USING btree ("version_slug");
  CREATE INDEX "_glossary_terms_v_version_version_last_edited_by_idx" ON "_glossary_terms_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_glossary_terms_v_version_version_legacy_id_idx" ON "_glossary_terms_v" USING btree ("version_legacy_id");
  CREATE INDEX "_glossary_terms_v_version_version_updated_at_idx" ON "_glossary_terms_v" USING btree ("version_updated_at");
  CREATE INDEX "_glossary_terms_v_version_version_created_at_idx" ON "_glossary_terms_v" USING btree ("version_created_at");
  CREATE INDEX "_glossary_terms_v_version_version__status_idx" ON "_glossary_terms_v" USING btree ("version__status");
  CREATE INDEX "_glossary_terms_v_created_at_idx" ON "_glossary_terms_v" USING btree ("created_at");
  CREATE INDEX "_glossary_terms_v_updated_at_idx" ON "_glossary_terms_v" USING btree ("updated_at");
  CREATE INDEX "_glossary_terms_v_snapshot_idx" ON "_glossary_terms_v" USING btree ("snapshot");
  CREATE INDEX "_glossary_terms_v_published_locale_idx" ON "_glossary_terms_v" USING btree ("published_locale");
  CREATE INDEX "_glossary_terms_v_latest_idx" ON "_glossary_terms_v" USING btree ("latest");
  CREATE INDEX "_glossary_terms_v_autosave_idx" ON "_glossary_terms_v" USING btree ("autosave");
  CREATE INDEX "_glossary_terms_v_version_translation_version_translatio_idx" ON "_glossary_terms_v_locales" USING btree ("version_translation_assignee_id");
  CREATE INDEX "_glossary_terms_v_version_translation_version_translat_1_idx" ON "_glossary_terms_v_locales" USING btree ("version_translation_translated_by_id");
  CREATE INDEX "_glossary_terms_v_version_translation_version_translat_2_idx" ON "_glossary_terms_v_locales" USING btree ("version_translation_reviewed_by_id");
  CREATE INDEX "_glossary_terms_v_version_seo_version_seo_image_idx" ON "_glossary_terms_v_locales" USING btree ("version_seo_image_id");
  CREATE UNIQUE INDEX "_glossary_terms_v_locales_locale_parent_id_unique" ON "_glossary_terms_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_glossary_terms_v_texts_order_parent" ON "_glossary_terms_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_glossary_terms_v_rels_order_idx" ON "_glossary_terms_v_rels" USING btree ("order");
  CREATE INDEX "_glossary_terms_v_rels_parent_idx" ON "_glossary_terms_v_rels" USING btree ("parent_id");
  CREATE INDEX "_glossary_terms_v_rels_path_idx" ON "_glossary_terms_v_rels" USING btree ("path");
  CREATE INDEX "_glossary_terms_v_rels_glossary_terms_id_idx" ON "_glossary_terms_v_rels" USING btree ("glossary_terms_id");
  CREATE INDEX "institutions_status_history_order_idx" ON "institutions_status_history" USING btree ("_order");
  CREATE INDEX "institutions_status_history_parent_id_idx" ON "institutions_status_history" USING btree ("_parent_id");
  CREATE INDEX "institutions_article_idx" ON "institutions" USING btree ("article_id");
  CREATE INDEX "institutions_last_edited_by_idx" ON "institutions" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "institutions_legacy_id_idx" ON "institutions" USING btree ("legacy_id");
  CREATE INDEX "institutions_updated_at_idx" ON "institutions" USING btree ("updated_at");
  CREATE INDEX "institutions_created_at_idx" ON "institutions" USING btree ("created_at");
  CREATE INDEX "institutions__status_idx" ON "institutions" USING btree ("_status");
  CREATE INDEX "institutions_translation_translation_assignee_idx" ON "institutions_locales" USING btree ("translation_assignee_id");
  CREATE INDEX "institutions_translation_translation_translated_by_idx" ON "institutions_locales" USING btree ("translation_translated_by_id");
  CREATE INDEX "institutions_translation_translation_reviewed_by_idx" ON "institutions_locales" USING btree ("translation_reviewed_by_id");
  CREATE UNIQUE INDEX "institutions_locales_locale_parent_id_unique" ON "institutions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "institutions_texts_order_parent" ON "institutions_texts" USING btree ("order","parent_id");
  CREATE INDEX "_institutions_v_version_status_history_order_idx" ON "_institutions_v_version_status_history" USING btree ("_order");
  CREATE INDEX "_institutions_v_version_status_history_parent_id_idx" ON "_institutions_v_version_status_history" USING btree ("_parent_id");
  CREATE INDEX "_institutions_v_parent_idx" ON "_institutions_v" USING btree ("parent_id");
  CREATE INDEX "_institutions_v_version_version_article_idx" ON "_institutions_v" USING btree ("version_article_id");
  CREATE INDEX "_institutions_v_version_version_last_edited_by_idx" ON "_institutions_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_institutions_v_version_version_legacy_id_idx" ON "_institutions_v" USING btree ("version_legacy_id");
  CREATE INDEX "_institutions_v_version_version_updated_at_idx" ON "_institutions_v" USING btree ("version_updated_at");
  CREATE INDEX "_institutions_v_version_version_created_at_idx" ON "_institutions_v" USING btree ("version_created_at");
  CREATE INDEX "_institutions_v_version_version__status_idx" ON "_institutions_v" USING btree ("version__status");
  CREATE INDEX "_institutions_v_created_at_idx" ON "_institutions_v" USING btree ("created_at");
  CREATE INDEX "_institutions_v_updated_at_idx" ON "_institutions_v" USING btree ("updated_at");
  CREATE INDEX "_institutions_v_snapshot_idx" ON "_institutions_v" USING btree ("snapshot");
  CREATE INDEX "_institutions_v_published_locale_idx" ON "_institutions_v" USING btree ("published_locale");
  CREATE INDEX "_institutions_v_latest_idx" ON "_institutions_v" USING btree ("latest");
  CREATE INDEX "_institutions_v_autosave_idx" ON "_institutions_v" USING btree ("autosave");
  CREATE INDEX "_institutions_v_version_translation_version_translation__idx" ON "_institutions_v_locales" USING btree ("version_translation_assignee_id");
  CREATE INDEX "_institutions_v_version_translation_version_translatio_1_idx" ON "_institutions_v_locales" USING btree ("version_translation_translated_by_id");
  CREATE INDEX "_institutions_v_version_translation_version_translatio_2_idx" ON "_institutions_v_locales" USING btree ("version_translation_reviewed_by_id");
  CREATE UNIQUE INDEX "_institutions_v_locales_locale_parent_id_unique" ON "_institutions_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_institutions_v_texts_order_parent" ON "_institutions_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "milestones_date_idx" ON "milestones" USING btree ("date");
  CREATE INDEX "milestones_article_idx" ON "milestones" USING btree ("article_id");
  CREATE INDEX "milestones_last_edited_by_idx" ON "milestones" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "milestones_legacy_id_idx" ON "milestones" USING btree ("legacy_id");
  CREATE INDEX "milestones_updated_at_idx" ON "milestones" USING btree ("updated_at");
  CREATE INDEX "milestones_created_at_idx" ON "milestones" USING btree ("created_at");
  CREATE INDEX "milestones__status_idx" ON "milestones" USING btree ("_status");
  CREATE INDEX "milestones_translation_translation_assignee_idx" ON "milestones_locales" USING btree ("translation_assignee_id");
  CREATE INDEX "milestones_translation_translation_translated_by_idx" ON "milestones_locales" USING btree ("translation_translated_by_id");
  CREATE INDEX "milestones_translation_translation_reviewed_by_idx" ON "milestones_locales" USING btree ("translation_reviewed_by_id");
  CREATE UNIQUE INDEX "milestones_locales_locale_parent_id_unique" ON "milestones_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_milestones_v_parent_idx" ON "_milestones_v" USING btree ("parent_id");
  CREATE INDEX "_milestones_v_version_version_date_idx" ON "_milestones_v" USING btree ("version_date");
  CREATE INDEX "_milestones_v_version_version_article_idx" ON "_milestones_v" USING btree ("version_article_id");
  CREATE INDEX "_milestones_v_version_version_last_edited_by_idx" ON "_milestones_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_milestones_v_version_version_legacy_id_idx" ON "_milestones_v" USING btree ("version_legacy_id");
  CREATE INDEX "_milestones_v_version_version_updated_at_idx" ON "_milestones_v" USING btree ("version_updated_at");
  CREATE INDEX "_milestones_v_version_version_created_at_idx" ON "_milestones_v" USING btree ("version_created_at");
  CREATE INDEX "_milestones_v_version_version__status_idx" ON "_milestones_v" USING btree ("version__status");
  CREATE INDEX "_milestones_v_created_at_idx" ON "_milestones_v" USING btree ("created_at");
  CREATE INDEX "_milestones_v_updated_at_idx" ON "_milestones_v" USING btree ("updated_at");
  CREATE INDEX "_milestones_v_snapshot_idx" ON "_milestones_v" USING btree ("snapshot");
  CREATE INDEX "_milestones_v_published_locale_idx" ON "_milestones_v" USING btree ("published_locale");
  CREATE INDEX "_milestones_v_latest_idx" ON "_milestones_v" USING btree ("latest");
  CREATE INDEX "_milestones_v_autosave_idx" ON "_milestones_v" USING btree ("autosave");
  CREATE INDEX "_milestones_v_version_translation_version_translation_as_idx" ON "_milestones_v_locales" USING btree ("version_translation_assignee_id");
  CREATE INDEX "_milestones_v_version_translation_version_translation_tr_idx" ON "_milestones_v_locales" USING btree ("version_translation_translated_by_id");
  CREATE INDEX "_milestones_v_version_translation_version_translation_re_idx" ON "_milestones_v_locales" USING btree ("version_translation_reviewed_by_id");
  CREATE UNIQUE INDEX "_milestones_v_locales_locale_parent_id_unique" ON "_milestones_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "club_events_agenda_order_idx" ON "club_events_agenda" USING btree ("_order");
  CREATE INDEX "club_events_agenda_parent_id_idx" ON "club_events_agenda" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "club_events_agenda_locales_locale_parent_id_unique" ON "club_events_agenda_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "club_events_speakers_order_idx" ON "club_events_speakers" USING btree ("_order");
  CREATE INDEX "club_events_speakers_parent_id_idx" ON "club_events_speakers" USING btree ("_parent_id");
  CREATE INDEX "club_events_speakers_portrait_idx" ON "club_events_speakers" USING btree ("portrait_id");
  CREATE INDEX "club_events_takeaways_order_idx" ON "club_events_takeaways" USING btree ("_order");
  CREATE INDEX "club_events_takeaways_parent_id_idx" ON "club_events_takeaways" USING btree ("_parent_id");
  CREATE INDEX "club_events_takeaways_locale_idx" ON "club_events_takeaways" USING btree ("_locale");
  CREATE UNIQUE INDEX "club_events_slug_idx" ON "club_events" USING btree ("slug");
  CREATE UNIQUE INDEX "club_events_number_idx" ON "club_events" USING btree ("number");
  CREATE INDEX "club_events_last_edited_by_idx" ON "club_events" USING btree ("last_edited_by_id");
  CREATE UNIQUE INDEX "club_events_legacy_id_idx" ON "club_events" USING btree ("legacy_id");
  CREATE INDEX "club_events_starts_at_idx" ON "club_events" USING btree ("starts_at");
  CREATE INDEX "club_events_image_idx" ON "club_events" USING btree ("image_id");
  CREATE INDEX "club_events_updated_at_idx" ON "club_events" USING btree ("updated_at");
  CREATE INDEX "club_events_created_at_idx" ON "club_events" USING btree ("created_at");
  CREATE INDEX "club_events__status_idx" ON "club_events" USING btree ("_status");
  CREATE INDEX "club_events_translation_translation_assignee_idx" ON "club_events_locales" USING btree ("translation_assignee_id");
  CREATE INDEX "club_events_translation_translation_translated_by_idx" ON "club_events_locales" USING btree ("translation_translated_by_id");
  CREATE INDEX "club_events_translation_translation_reviewed_by_idx" ON "club_events_locales" USING btree ("translation_reviewed_by_id");
  CREATE INDEX "club_events_seo_seo_image_idx" ON "club_events_locales" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "club_events_locales_locale_parent_id_unique" ON "club_events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_club_events_v_version_agenda_order_idx" ON "_club_events_v_version_agenda" USING btree ("_order");
  CREATE INDEX "_club_events_v_version_agenda_parent_id_idx" ON "_club_events_v_version_agenda" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_club_events_v_version_agenda_locales_locale_parent_id_uniqu" ON "_club_events_v_version_agenda_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_club_events_v_version_speakers_order_idx" ON "_club_events_v_version_speakers" USING btree ("_order");
  CREATE INDEX "_club_events_v_version_speakers_parent_id_idx" ON "_club_events_v_version_speakers" USING btree ("_parent_id");
  CREATE INDEX "_club_events_v_version_speakers_portrait_idx" ON "_club_events_v_version_speakers" USING btree ("portrait_id");
  CREATE INDEX "_club_events_v_version_takeaways_order_idx" ON "_club_events_v_version_takeaways" USING btree ("_order");
  CREATE INDEX "_club_events_v_version_takeaways_parent_id_idx" ON "_club_events_v_version_takeaways" USING btree ("_parent_id");
  CREATE INDEX "_club_events_v_version_takeaways_locale_idx" ON "_club_events_v_version_takeaways" USING btree ("_locale");
  CREATE INDEX "_club_events_v_parent_idx" ON "_club_events_v" USING btree ("parent_id");
  CREATE INDEX "_club_events_v_version_version_slug_idx" ON "_club_events_v" USING btree ("version_slug");
  CREATE INDEX "_club_events_v_version_version_number_idx" ON "_club_events_v" USING btree ("version_number");
  CREATE INDEX "_club_events_v_version_version_last_edited_by_idx" ON "_club_events_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_club_events_v_version_version_legacy_id_idx" ON "_club_events_v" USING btree ("version_legacy_id");
  CREATE INDEX "_club_events_v_version_version_starts_at_idx" ON "_club_events_v" USING btree ("version_starts_at");
  CREATE INDEX "_club_events_v_version_version_image_idx" ON "_club_events_v" USING btree ("version_image_id");
  CREATE INDEX "_club_events_v_version_version_updated_at_idx" ON "_club_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_club_events_v_version_version_created_at_idx" ON "_club_events_v" USING btree ("version_created_at");
  CREATE INDEX "_club_events_v_version_version__status_idx" ON "_club_events_v" USING btree ("version__status");
  CREATE INDEX "_club_events_v_created_at_idx" ON "_club_events_v" USING btree ("created_at");
  CREATE INDEX "_club_events_v_updated_at_idx" ON "_club_events_v" USING btree ("updated_at");
  CREATE INDEX "_club_events_v_snapshot_idx" ON "_club_events_v" USING btree ("snapshot");
  CREATE INDEX "_club_events_v_published_locale_idx" ON "_club_events_v" USING btree ("published_locale");
  CREATE INDEX "_club_events_v_latest_idx" ON "_club_events_v" USING btree ("latest");
  CREATE INDEX "_club_events_v_autosave_idx" ON "_club_events_v" USING btree ("autosave");
  CREATE INDEX "_club_events_v_version_translation_version_translation_a_idx" ON "_club_events_v_locales" USING btree ("version_translation_assignee_id");
  CREATE INDEX "_club_events_v_version_translation_version_translation_t_idx" ON "_club_events_v_locales" USING btree ("version_translation_translated_by_id");
  CREATE INDEX "_club_events_v_version_translation_version_translation_r_idx" ON "_club_events_v_locales" USING btree ("version_translation_reviewed_by_id");
  CREATE INDEX "_club_events_v_version_seo_version_seo_image_idx" ON "_club_events_v_locales" USING btree ("version_seo_image_id");
  CREATE UNIQUE INDEX "_club_events_v_locales_locale_parent_id_unique" ON "_club_events_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "requests_kind_idx" ON "requests" USING btree ("kind");
  CREATE INDEX "requests_article_idx" ON "requests" USING btree ("article_id");
  CREATE INDEX "requests_assigned_to_idx" ON "requests" USING btree ("assigned_to_id");
  CREATE INDEX "requests_due_at_idx" ON "requests" USING btree ("due_at");
  CREATE INDEX "requests_status_idx" ON "requests" USING btree ("status");
  CREATE INDEX "requests_decided_by_idx" ON "requests" USING btree ("decided_by_id");
  CREATE INDEX "requests_retain_until_idx" ON "requests" USING btree ("retain_until");
  CREATE INDEX "requests_created_by_idx" ON "requests" USING btree ("created_by_id");
  CREATE INDEX "requests_updated_at_idx" ON "requests" USING btree ("updated_at");
  CREATE INDEX "requests_created_at_idx" ON "requests" USING btree ("created_at");
  CREATE INDEX "telegram_posts_history_order_idx" ON "telegram_posts_history" USING btree ("_order");
  CREATE INDEX "telegram_posts_history_parent_id_idx" ON "telegram_posts_history" USING btree ("_parent_id");
  CREATE INDEX "telegram_posts_article_idx" ON "telegram_posts" USING btree ("article_id");
  CREATE INDEX "telegram_posts_status_idx" ON "telegram_posts" USING btree ("status");
  CREATE INDEX "telegram_posts_photo_idx" ON "telegram_posts" USING btree ("photo_id");
  CREATE INDEX "telegram_posts_sponsored_idx" ON "telegram_posts" USING btree ("sponsored");
  CREATE INDEX "telegram_posts_requested_by_idx" ON "telegram_posts" USING btree ("requested_by_id");
  CREATE INDEX "telegram_posts_approved_by_idx" ON "telegram_posts" USING btree ("approved_by_id");
  CREATE INDEX "telegram_posts_updated_at_idx" ON "telegram_posts" USING btree ("updated_at");
  CREATE INDEX "telegram_posts_created_at_idx" ON "telegram_posts" USING btree ("created_at");
  CREATE INDEX "club_applications_interests_order_idx" ON "club_applications_interests" USING btree ("order");
  CREATE INDEX "club_applications_interests_parent_idx" ON "club_applications_interests" USING btree ("parent_id");
  CREATE INDEX "club_applications_email_idx" ON "club_applications" USING btree ("email");
  CREATE INDEX "club_applications_event_idx" ON "club_applications" USING btree ("event_id");
  CREATE INDEX "club_applications_status_idx" ON "club_applications" USING btree ("status");
  CREATE INDEX "club_applications_assigned_to_idx" ON "club_applications" USING btree ("assigned_to_id");
  CREATE INDEX "club_applications_retain_until_idx" ON "club_applications" USING btree ("retain_until");
  CREATE INDEX "club_applications_updated_at_idx" ON "club_applications" USING btree ("updated_at");
  CREATE INDEX "club_applications_created_at_idx" ON "club_applications" USING btree ("created_at");
  CREATE UNIQUE INDEX "digest_subscribers_email_idx" ON "digest_subscribers" USING btree ("email");
  CREATE INDEX "digest_subscribers_status_idx" ON "digest_subscribers" USING btree ("status");
  CREATE INDEX "digest_subscribers_assigned_to_idx" ON "digest_subscribers" USING btree ("assigned_to_id");
  CREATE INDEX "digest_subscribers_retain_until_idx" ON "digest_subscribers" USING btree ("retain_until");
  CREATE INDEX "digest_subscribers_updated_at_idx" ON "digest_subscribers" USING btree ("updated_at");
  CREATE INDEX "digest_subscribers_created_at_idx" ON "digest_subscribers" USING btree ("created_at");
  CREATE INDEX "contact_messages_topic_idx" ON "contact_messages" USING btree ("topic");
  CREATE INDEX "contact_messages_email_idx" ON "contact_messages" USING btree ("email");
  CREATE INDEX "contact_messages_article_idx" ON "contact_messages" USING btree ("article_id");
  CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status");
  CREATE INDEX "contact_messages_assigned_to_idx" ON "contact_messages" USING btree ("assigned_to_id");
  CREATE INDEX "contact_messages_retain_until_idx" ON "contact_messages" USING btree ("retain_until");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE INDEX "advertising_requests_email_idx" ON "advertising_requests" USING btree ("email");
  CREATE INDEX "advertising_requests_status_idx" ON "advertising_requests" USING btree ("status");
  CREATE INDEX "advertising_requests_assigned_to_idx" ON "advertising_requests" USING btree ("assigned_to_id");
  CREATE INDEX "advertising_requests_retain_until_idx" ON "advertising_requests" USING btree ("retain_until");
  CREATE INDEX "advertising_requests_updated_at_idx" ON "advertising_requests" USING btree ("updated_at");
  CREATE INDEX "advertising_requests_created_at_idx" ON "advertising_requests" USING btree ("created_at");
  CREATE INDEX "users_declared_interests_order_idx" ON "users_declared_interests" USING btree ("_order");
  CREATE INDEX "users_declared_interests_parent_id_idx" ON "users_declared_interests" USING btree ("_parent_id");
  CREATE INDEX "users_declared_interests_institution_idx" ON "users_declared_interests" USING btree ("institution_id");
  CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");
  CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE INDEX "collection_docId_idx" ON "audit_log" USING btree ("collection","doc_id");
  CREATE INDEX "publish_events_at_idx" ON "publish_events" USING btree ("at");
  CREATE INDEX "publish_events_status_idx" ON "publish_events" USING btree ("status");
  CREATE INDEX "publish_events_updated_at_idx" ON "publish_events" USING btree ("updated_at");
  CREATE INDEX "publish_events_created_at_idx" ON "publish_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_articles_id_idx" ON "redirects_rels" USING btree ("articles_id");
  CREATE INDEX "redirects_rels_glossary_terms_id_idx" ON "redirects_rels" USING btree ("glossary_terms_id");
  CREATE INDEX "redirects_rels_club_events_id_idx" ON "redirects_rels" USING btree ("club_events_id");
  CREATE INDEX "redirects_rels_authors_id_idx" ON "redirects_rels" USING btree ("authors_id");
  CREATE INDEX "redirects_rels_tags_id_idx" ON "redirects_rels" USING btree ("tags_id");
  CREATE INDEX "payload_query_presets_updated_at_idx" ON "payload_query_presets" USING btree ("updated_at");
  CREATE INDEX "payload_query_presets_created_at_idx" ON "payload_query_presets" USING btree ("created_at");
  CREATE INDEX "payload_query_presets_rels_order_idx" ON "payload_query_presets_rels" USING btree ("order");
  CREATE INDEX "payload_query_presets_rels_parent_idx" ON "payload_query_presets_rels" USING btree ("parent_id");
  CREATE INDEX "payload_query_presets_rels_path_idx" ON "payload_query_presets_rels" USING btree ("path");
  CREATE INDEX "payload_query_presets_rels_users_id_idx" ON "payload_query_presets_rels" USING btree ("users_id");
  CREATE INDEX "home_page_pinned_order_idx" ON "home_page_pinned" USING btree ("_order");
  CREATE INDEX "home_page_pinned_parent_id_idx" ON "home_page_pinned" USING btree ("_parent_id");
  CREATE INDEX "home_page_pinned_article_idx" ON "home_page_pinned" USING btree ("article_id");
  CREATE INDEX "home_page_lead_idx" ON "home_page" USING btree ("lead_id");
  CREATE INDEX "home_page_breaking_breaking_article_idx" ON "home_page" USING btree ("breaking_article_id");
  CREATE INDEX "home_page_interview_feature_idx" ON "home_page" USING btree ("interview_feature_id");
  CREATE INDEX "home_page_sponsored_teaser_idx" ON "home_page" USING btree ("sponsored_teaser_id");
  CREATE INDEX "home_page_launched_by_idx" ON "home_page" USING btree ("launched_by_id");
  CREATE INDEX "home_page__status_idx" ON "home_page" USING btree ("_status");
  CREATE UNIQUE INDEX "home_page_locales_locale_parent_id_unique" ON "home_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_rels_order_idx" ON "home_page_rels" USING btree ("order");
  CREATE INDEX "home_page_rels_parent_idx" ON "home_page_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_rels_path_idx" ON "home_page_rels" USING btree ("path");
  CREATE INDEX "home_page_rels_articles_id_idx" ON "home_page_rels" USING btree ("articles_id");
  CREATE INDEX "_home_page_v_version_pinned_order_idx" ON "_home_page_v_version_pinned" USING btree ("_order");
  CREATE INDEX "_home_page_v_version_pinned_parent_id_idx" ON "_home_page_v_version_pinned" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_version_pinned_article_idx" ON "_home_page_v_version_pinned" USING btree ("article_id");
  CREATE INDEX "_home_page_v_version_version_lead_idx" ON "_home_page_v" USING btree ("version_lead_id");
  CREATE INDEX "_home_page_v_version_breaking_version_breaking_article_idx" ON "_home_page_v" USING btree ("version_breaking_article_id");
  CREATE INDEX "_home_page_v_version_version_interview_feature_idx" ON "_home_page_v" USING btree ("version_interview_feature_id");
  CREATE INDEX "_home_page_v_version_version_sponsored_teaser_idx" ON "_home_page_v" USING btree ("version_sponsored_teaser_id");
  CREATE INDEX "_home_page_v_version_version_launched_by_idx" ON "_home_page_v" USING btree ("version_launched_by_id");
  CREATE INDEX "_home_page_v_version_version__status_idx" ON "_home_page_v" USING btree ("version__status");
  CREATE INDEX "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at");
  CREATE INDEX "_home_page_v_snapshot_idx" ON "_home_page_v" USING btree ("snapshot");
  CREATE INDEX "_home_page_v_published_locale_idx" ON "_home_page_v" USING btree ("published_locale");
  CREATE INDEX "_home_page_v_latest_idx" ON "_home_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_home_page_v_locales_locale_parent_id_unique" ON "_home_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_rels_order_idx" ON "_home_page_v_rels" USING btree ("order");
  CREATE INDEX "_home_page_v_rels_parent_idx" ON "_home_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_home_page_v_rels_path_idx" ON "_home_page_v_rels" USING btree ("path");
  CREATE INDEX "_home_page_v_rels_articles_id_idx" ON "_home_page_v_rels" USING btree ("articles_id");
  CREATE INDEX "navigation_header_order_idx" ON "navigation_header" USING btree ("_order");
  CREATE INDEX "navigation_header_parent_id_idx" ON "navigation_header" USING btree ("_parent_id");
  CREATE INDEX "navigation_header_rubric_idx" ON "navigation_header" USING btree ("rubric_id");
  CREATE UNIQUE INDEX "navigation_header_locales_locale_parent_id_unique" ON "navigation_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_footer_items_order_idx" ON "navigation_footer_items" USING btree ("_order");
  CREATE INDEX "navigation_footer_items_parent_id_idx" ON "navigation_footer_items" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_items_rubric_idx" ON "navigation_footer_items" USING btree ("rubric_id");
  CREATE UNIQUE INDEX "navigation_footer_items_locales_locale_parent_id_unique" ON "navigation_footer_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_footer_order_idx" ON "navigation_footer" USING btree ("_order");
  CREATE INDEX "navigation_footer_parent_id_idx" ON "navigation_footer" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_footer_locales_locale_parent_id_unique" ON "navigation_footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation__status_idx" ON "navigation" USING btree ("_status");
  CREATE INDEX "_navigation_v_version_header_order_idx" ON "_navigation_v_version_header" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_header_parent_id_idx" ON "_navigation_v_version_header" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_header_rubric_idx" ON "_navigation_v_version_header" USING btree ("rubric_id");
  CREATE UNIQUE INDEX "_navigation_v_version_header_locales_locale_parent_id_unique" ON "_navigation_v_version_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_footer_items_order_idx" ON "_navigation_v_version_footer_items" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_footer_items_parent_id_idx" ON "_navigation_v_version_footer_items" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_footer_items_rubric_idx" ON "_navigation_v_version_footer_items" USING btree ("rubric_id");
  CREATE UNIQUE INDEX "_navigation_v_version_footer_items_locales_locale_parent_id_" ON "_navigation_v_version_footer_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_footer_order_idx" ON "_navigation_v_version_footer" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_footer_parent_id_idx" ON "_navigation_v_version_footer" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_footer_locales_locale_parent_id_unique" ON "_navigation_v_version_footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_version__status_idx" ON "_navigation_v" USING btree ("version__status");
  CREATE INDEX "_navigation_v_created_at_idx" ON "_navigation_v" USING btree ("created_at");
  CREATE INDEX "_navigation_v_updated_at_idx" ON "_navigation_v" USING btree ("updated_at");
  CREATE INDEX "_navigation_v_snapshot_idx" ON "_navigation_v" USING btree ("snapshot");
  CREATE INDEX "_navigation_v_published_locale_idx" ON "_navigation_v" USING btree ("published_locale");
  CREATE INDEX "_navigation_v_latest_idx" ON "_navigation_v" USING btree ("latest");
  CREATE INDEX "ad_slots_slots_order_idx" ON "ad_slots_slots" USING btree ("_order");
  CREATE INDEX "ad_slots_slots_parent_id_idx" ON "ad_slots_slots" USING btree ("_parent_id");
  CREATE INDEX "ad_slots_slots_creative_idx" ON "ad_slots_slots" USING btree ("creative_id");
  CREATE INDEX "ad_slots_slots_creative_uz_idx" ON "ad_slots_slots" USING btree ("creative_uz_id");
  CREATE UNIQUE INDEX "ad_slots_slots_locales_locale_parent_id_unique" ON "ad_slots_slots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ad_slots__status_idx" ON "ad_slots" USING btree ("_status");
  CREATE INDEX "_ad_slots_v_version_slots_order_idx" ON "_ad_slots_v_version_slots" USING btree ("_order");
  CREATE INDEX "_ad_slots_v_version_slots_parent_id_idx" ON "_ad_slots_v_version_slots" USING btree ("_parent_id");
  CREATE INDEX "_ad_slots_v_version_slots_creative_idx" ON "_ad_slots_v_version_slots" USING btree ("creative_id");
  CREATE INDEX "_ad_slots_v_version_slots_creative_uz_idx" ON "_ad_slots_v_version_slots" USING btree ("creative_uz_id");
  CREATE UNIQUE INDEX "_ad_slots_v_version_slots_locales_locale_parent_id_unique" ON "_ad_slots_v_version_slots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_ad_slots_v_version_version__status_idx" ON "_ad_slots_v" USING btree ("version__status");
  CREATE INDEX "_ad_slots_v_created_at_idx" ON "_ad_slots_v" USING btree ("created_at");
  CREATE INDEX "_ad_slots_v_updated_at_idx" ON "_ad_slots_v" USING btree ("updated_at");
  CREATE INDEX "_ad_slots_v_snapshot_idx" ON "_ad_slots_v" USING btree ("snapshot");
  CREATE INDEX "_ad_slots_v_published_locale_idx" ON "_ad_slots_v" USING btree ("published_locale");
  CREATE INDEX "_ad_slots_v_latest_idx" ON "_ad_slots_v" USING btree ("latest");
  CREATE INDEX "site_settings_telegram_invite_links_order_idx" ON "site_settings_telegram_invite_links" USING btree ("_order");
  CREATE INDEX "site_settings_telegram_invite_links_parent_id_idx" ON "site_settings_telegram_invite_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_alert_recipients_order_idx" ON "site_settings_alert_recipients" USING btree ("_order");
  CREATE INDEX "site_settings_alert_recipients_parent_id_idx" ON "site_settings_alert_recipients" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_site_settings_v_version_telegram_invite_links_order_idx" ON "_site_settings_v_version_telegram_invite_links" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_telegram_invite_links_parent_id_idx" ON "_site_settings_v_version_telegram_invite_links" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_alert_recipients_v_order_idx" ON "_site_settings_alert_recipients_v" USING btree ("_order");
  CREATE INDEX "_site_settings_alert_recipients_v_parent_id_idx" ON "_site_settings_alert_recipients_v" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "editorial_rules_banned_terms_order_idx" ON "editorial_rules_banned_terms" USING btree ("_order");
  CREATE INDEX "editorial_rules_banned_terms_parent_id_idx" ON "editorial_rules_banned_terms" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_review_terms_order_idx" ON "editorial_rules_review_terms" USING btree ("_order");
  CREATE INDEX "editorial_rules_review_terms_parent_id_idx" ON "editorial_rules_review_terms" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_real_org_names_order_idx" ON "editorial_rules_real_org_names" USING btree ("_order");
  CREATE INDEX "editorial_rules_real_org_names_parent_id_idx" ON "editorial_rules_real_org_names" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_house_spellings_order_idx" ON "editorial_rules_house_spellings" USING btree ("_order");
  CREATE INDEX "editorial_rules_house_spellings_parent_id_idx" ON "editorial_rules_house_spellings" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_return_phrases_order_idx" ON "editorial_rules_return_phrases" USING btree ("_order");
  CREATE INDEX "editorial_rules_return_phrases_parent_id_idx" ON "editorial_rules_return_phrases" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_source_domains_order_idx" ON "editorial_rules_source_domains" USING btree ("_order");
  CREATE INDEX "editorial_rules_source_domains_parent_id_idx" ON "editorial_rules_source_domains" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_translit_exceptions_order_idx" ON "editorial_rules_translit_exceptions" USING btree ("_order");
  CREATE INDEX "editorial_rules_translit_exceptions_parent_id_idx" ON "editorial_rules_translit_exceptions" USING btree ("_parent_id");
  CREATE INDEX "editorial_rules_translit_keep_order_idx" ON "editorial_rules_translit_keep" USING btree ("_order");
  CREATE INDEX "editorial_rules_translit_keep_parent_id_idx" ON "editorial_rules_translit_keep" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_version_banned_terms_order_idx" ON "_editorial_rules_v_version_banned_terms" USING btree ("_order");
  CREATE INDEX "_editorial_rules_v_version_banned_terms_parent_id_idx" ON "_editorial_rules_v_version_banned_terms" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_version_review_terms_order_idx" ON "_editorial_rules_v_version_review_terms" USING btree ("_order");
  CREATE INDEX "_editorial_rules_v_version_review_terms_parent_id_idx" ON "_editorial_rules_v_version_review_terms" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_version_real_org_names_order_idx" ON "_editorial_rules_v_version_real_org_names" USING btree ("_order");
  CREATE INDEX "_editorial_rules_v_version_real_org_names_parent_id_idx" ON "_editorial_rules_v_version_real_org_names" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_version_house_spellings_order_idx" ON "_editorial_rules_v_version_house_spellings" USING btree ("_order");
  CREATE INDEX "_editorial_rules_v_version_house_spellings_parent_id_idx" ON "_editorial_rules_v_version_house_spellings" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_return_phrases_v_order_idx" ON "_editorial_rules_return_phrases_v" USING btree ("_order");
  CREATE INDEX "_editorial_rules_return_phrases_v_parent_id_idx" ON "_editorial_rules_return_phrases_v" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_source_domains_v_order_idx" ON "_editorial_rules_source_domains_v" USING btree ("_order");
  CREATE INDEX "_editorial_rules_source_domains_v_parent_id_idx" ON "_editorial_rules_source_domains_v" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_version_translit_exceptions_order_idx" ON "_editorial_rules_v_version_translit_exceptions" USING btree ("_order");
  CREATE INDEX "_editorial_rules_v_version_translit_exceptions_parent_id_idx" ON "_editorial_rules_v_version_translit_exceptions" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_version_translit_keep_order_idx" ON "_editorial_rules_v_version_translit_keep" USING btree ("_order");
  CREATE INDEX "_editorial_rules_v_version_translit_keep_parent_id_idx" ON "_editorial_rules_v_version_translit_keep" USING btree ("_parent_id");
  CREATE INDEX "_editorial_rules_v_created_at_idx" ON "_editorial_rules_v" USING btree ("created_at");
  CREATE INDEX "_editorial_rules_v_updated_at_idx" ON "_editorial_rules_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rubrics_fk" FOREIGN KEY ("rubrics_id") REFERENCES "public"."rubrics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_institutions_fk" FOREIGN KEY ("institutions_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_milestones_fk" FOREIGN KEY ("milestones_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_club_events_fk" FOREIGN KEY ("club_events_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_requests_fk" FOREIGN KEY ("requests_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_telegram_posts_fk" FOREIGN KEY ("telegram_posts_id") REFERENCES "public"."telegram_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_club_applications_fk" FOREIGN KEY ("club_applications_id") REFERENCES "public"."club_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_digest_subscribers_fk" FOREIGN KEY ("digest_subscribers_id") REFERENCES "public"."digest_subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_advertising_requests_fk" FOREIGN KEY ("advertising_requests_id") REFERENCES "public"."advertising_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_authors_id_idx" ON "payload_locked_documents_rels" USING btree ("authors_id");
  CREATE INDEX "payload_locked_documents_rels_rubrics_id_idx" ON "payload_locked_documents_rels" USING btree ("rubrics_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_glossary_terms_id_idx" ON "payload_locked_documents_rels" USING btree ("glossary_terms_id");
  CREATE INDEX "payload_locked_documents_rels_institutions_id_idx" ON "payload_locked_documents_rels" USING btree ("institutions_id");
  CREATE INDEX "payload_locked_documents_rels_milestones_id_idx" ON "payload_locked_documents_rels" USING btree ("milestones_id");
  CREATE INDEX "payload_locked_documents_rels_club_events_id_idx" ON "payload_locked_documents_rels" USING btree ("club_events_id");
  CREATE INDEX "payload_locked_documents_rels_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("requests_id");
  CREATE INDEX "payload_locked_documents_rels_telegram_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("telegram_posts_id");
  CREATE INDEX "payload_locked_documents_rels_club_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("club_applications_id");
  CREATE INDEX "payload_locked_documents_rels_digest_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("digest_subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_locked_documents_rels_advertising_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("advertising_requests_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");`)

  // Append-only audit log (CMS-SPEC §9.1, PHASE0-FINDINGS §1.3): the app role
  // keeps INSERT and SELECT on audit_log (and on any audit_log_* child table,
  // though the collection is kept free of them) but loses UPDATE, DELETE and
  // TRUNCATE. publish_events keeps UPDATE (the worker marks rows done) but
  // loses DELETE and TRUNCATE. Skipped where the role does not exist (a
  // scratch database). The default privileges give UPDATE and DELETE to every
  // table a migration creates, so a later migration that re-creates either
  // table must repeat this.
  await db.execute(sql`
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'muomalat_app') THEN
    FOR t IN
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND (tablename = 'audit_log' OR left(tablename, 10) = 'audit_log_')
    LOOP
      EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON public.%I FROM muomalat_app', t);
    END LOOP;
    REVOKE DELETE, TRUNCATE ON public.publish_events FROM muomalat_app;
  END IF;
END
$$;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Undo the audit hardening first; the tables are dropped below anyway.
  // (The generated statements were edited in one place: the lock-table
  // foreign keys are dropped with IF EXISTS, because the DROP TABLE … CASCADE
  // before them has already removed them.)
  await db.execute(sql`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'muomalat_app') THEN
    IF to_regclass('public.audit_log') IS NOT NULL THEN
      GRANT UPDATE, DELETE ON public.audit_log TO muomalat_app;
    END IF;
    IF to_regclass('public.publish_events') IS NOT NULL THEN
      GRANT DELETE ON public.publish_events TO muomalat_app;
    END IF;
  END IF;
END
$$;`)

  await db.execute(sql`
   ALTER TABLE "articles_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_workflow_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_corrections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_corrections_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_slug_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_workflow_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_corrections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_corrections_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_slug_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "authors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "authors_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_authors_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_authors_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rubrics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rubrics_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rubrics_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rubrics_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tags_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tags_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tags_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glossary_terms_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glossary_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glossary_terms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glossary_terms_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glossary_terms_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glossary_terms_v_version_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glossary_terms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glossary_terms_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glossary_terms_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glossary_terms_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "institutions_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "institutions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "institutions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "institutions_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_institutions_v_version_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_institutions_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_institutions_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_institutions_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "milestones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "milestones_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_milestones_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_milestones_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_events_agenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_events_agenda_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_events_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_events_takeaways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_events_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_club_events_v_version_agenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_club_events_v_version_agenda_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_club_events_v_version_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_club_events_v_version_takeaways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_club_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_club_events_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "telegram_posts_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "telegram_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_applications_interests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "club_applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "digest_subscribers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "advertising_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_declared_interests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "publish_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_query_presets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_query_presets_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page_pinned" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_page_v_version_pinned" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_page_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_page_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_footer_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_footer_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_footer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ad_slots_slots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ad_slots_slots_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ad_slots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_ad_slots_v_version_slots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_ad_slots_v_version_slots_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_ad_slots_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_telegram_invite_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_alert_recipients" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_version_telegram_invite_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_alert_recipients_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_banned_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_review_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_real_org_names" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_house_spellings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_return_phrases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_source_domains" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_translit_exceptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules_translit_keep" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editorial_rules" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v_version_banned_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v_version_review_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v_version_real_org_names" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v_version_house_spellings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_return_phrases_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_source_domains_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v_version_translit_exceptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v_version_translit_keep" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editorial_rules_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "articles_sources" CASCADE;
  DROP TABLE "articles_workflow_history" CASCADE;
  DROP TABLE "articles_corrections" CASCADE;
  DROP TABLE "articles_corrections_locales" CASCADE;
  DROP TABLE "articles_slug_history" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v_version_sources" CASCADE;
  DROP TABLE "_articles_v_version_workflow_history" CASCADE;
  DROP TABLE "_articles_v_version_corrections" CASCADE;
  DROP TABLE "_articles_v_version_corrections_locales" CASCADE;
  DROP TABLE "_articles_v_version_slug_history" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "authors" CASCADE;
  DROP TABLE "authors_locales" CASCADE;
  DROP TABLE "_authors_v" CASCADE;
  DROP TABLE "_authors_v_locales" CASCADE;
  DROP TABLE "rubrics" CASCADE;
  DROP TABLE "rubrics_locales" CASCADE;
  DROP TABLE "_rubrics_v" CASCADE;
  DROP TABLE "_rubrics_v_locales" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tags_locales" CASCADE;
  DROP TABLE "_tags_v" CASCADE;
  DROP TABLE "_tags_v_locales" CASCADE;
  DROP TABLE "glossary_terms_steps" CASCADE;
  DROP TABLE "glossary_terms" CASCADE;
  DROP TABLE "glossary_terms_locales" CASCADE;
  DROP TABLE "glossary_terms_texts" CASCADE;
  DROP TABLE "glossary_terms_rels" CASCADE;
  DROP TABLE "_glossary_terms_v_version_steps" CASCADE;
  DROP TABLE "_glossary_terms_v" CASCADE;
  DROP TABLE "_glossary_terms_v_locales" CASCADE;
  DROP TABLE "_glossary_terms_v_texts" CASCADE;
  DROP TABLE "_glossary_terms_v_rels" CASCADE;
  DROP TABLE "institutions_status_history" CASCADE;
  DROP TABLE "institutions" CASCADE;
  DROP TABLE "institutions_locales" CASCADE;
  DROP TABLE "institutions_texts" CASCADE;
  DROP TABLE "_institutions_v_version_status_history" CASCADE;
  DROP TABLE "_institutions_v" CASCADE;
  DROP TABLE "_institutions_v_locales" CASCADE;
  DROP TABLE "_institutions_v_texts" CASCADE;
  DROP TABLE "milestones" CASCADE;
  DROP TABLE "milestones_locales" CASCADE;
  DROP TABLE "_milestones_v" CASCADE;
  DROP TABLE "_milestones_v_locales" CASCADE;
  DROP TABLE "club_events_agenda" CASCADE;
  DROP TABLE "club_events_agenda_locales" CASCADE;
  DROP TABLE "club_events_speakers" CASCADE;
  DROP TABLE "club_events_takeaways" CASCADE;
  DROP TABLE "club_events" CASCADE;
  DROP TABLE "club_events_locales" CASCADE;
  DROP TABLE "_club_events_v_version_agenda" CASCADE;
  DROP TABLE "_club_events_v_version_agenda_locales" CASCADE;
  DROP TABLE "_club_events_v_version_speakers" CASCADE;
  DROP TABLE "_club_events_v_version_takeaways" CASCADE;
  DROP TABLE "_club_events_v" CASCADE;
  DROP TABLE "_club_events_v_locales" CASCADE;
  DROP TABLE "requests" CASCADE;
  DROP TABLE "telegram_posts_history" CASCADE;
  DROP TABLE "telegram_posts" CASCADE;
  DROP TABLE "club_applications_interests" CASCADE;
  DROP TABLE "club_applications" CASCADE;
  DROP TABLE "digest_subscribers" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "advertising_requests" CASCADE;
  DROP TABLE "users_declared_interests" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "publish_events" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  DROP TABLE "payload_query_presets" CASCADE;
  DROP TABLE "payload_query_presets_rels" CASCADE;
  DROP TABLE "home_page_pinned" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_locales" CASCADE;
  DROP TABLE "home_page_rels" CASCADE;
  DROP TABLE "_home_page_v_version_pinned" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  DROP TABLE "_home_page_v_locales" CASCADE;
  DROP TABLE "_home_page_v_rels" CASCADE;
  DROP TABLE "navigation_header" CASCADE;
  DROP TABLE "navigation_header_locales" CASCADE;
  DROP TABLE "navigation_footer_items" CASCADE;
  DROP TABLE "navigation_footer_items_locales" CASCADE;
  DROP TABLE "navigation_footer" CASCADE;
  DROP TABLE "navigation_footer_locales" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "_navigation_v_version_header" CASCADE;
  DROP TABLE "_navigation_v_version_header_locales" CASCADE;
  DROP TABLE "_navigation_v_version_footer_items" CASCADE;
  DROP TABLE "_navigation_v_version_footer_items_locales" CASCADE;
  DROP TABLE "_navigation_v_version_footer" CASCADE;
  DROP TABLE "_navigation_v_version_footer_locales" CASCADE;
  DROP TABLE "_navigation_v" CASCADE;
  DROP TABLE "ad_slots_slots" CASCADE;
  DROP TABLE "ad_slots_slots_locales" CASCADE;
  DROP TABLE "ad_slots" CASCADE;
  DROP TABLE "_ad_slots_v_version_slots" CASCADE;
  DROP TABLE "_ad_slots_v_version_slots_locales" CASCADE;
  DROP TABLE "_ad_slots_v" CASCADE;
  DROP TABLE "site_settings_telegram_invite_links" CASCADE;
  DROP TABLE "site_settings_alert_recipients" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_telegram_invite_links" CASCADE;
  DROP TABLE "_site_settings_alert_recipients_v" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "_site_settings_v_locales" CASCADE;
  DROP TABLE "editorial_rules_banned_terms" CASCADE;
  DROP TABLE "editorial_rules_review_terms" CASCADE;
  DROP TABLE "editorial_rules_real_org_names" CASCADE;
  DROP TABLE "editorial_rules_house_spellings" CASCADE;
  DROP TABLE "editorial_rules_return_phrases" CASCADE;
  DROP TABLE "editorial_rules_source_domains" CASCADE;
  DROP TABLE "editorial_rules_translit_exceptions" CASCADE;
  DROP TABLE "editorial_rules_translit_keep" CASCADE;
  DROP TABLE "editorial_rules" CASCADE;
  DROP TABLE "_editorial_rules_v_version_banned_terms" CASCADE;
  DROP TABLE "_editorial_rules_v_version_review_terms" CASCADE;
  DROP TABLE "_editorial_rules_v_version_real_org_names" CASCADE;
  DROP TABLE "_editorial_rules_v_version_house_spellings" CASCADE;
  DROP TABLE "_editorial_rules_return_phrases_v" CASCADE;
  DROP TABLE "_editorial_rules_source_domains_v" CASCADE;
  DROP TABLE "_editorial_rules_v_version_translit_exceptions" CASCADE;
  DROP TABLE "_editorial_rules_v_version_translit_keep" CASCADE;
  DROP TABLE "_editorial_rules_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_articles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_authors_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_rubrics_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_tags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_glossary_terms_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_institutions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_milestones_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_club_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_telegram_posts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_club_applications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_digest_subscribers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_contact_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_advertising_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_redirects_fk";
  
  DROP INDEX "payload_locked_documents_rels_articles_id_idx";
  DROP INDEX "payload_locked_documents_rels_authors_id_idx";
  DROP INDEX "payload_locked_documents_rels_rubrics_id_idx";
  DROP INDEX "payload_locked_documents_rels_tags_id_idx";
  DROP INDEX "payload_locked_documents_rels_glossary_terms_id_idx";
  DROP INDEX "payload_locked_documents_rels_institutions_id_idx";
  DROP INDEX "payload_locked_documents_rels_milestones_id_idx";
  DROP INDEX "payload_locked_documents_rels_club_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_telegram_posts_id_idx";
  DROP INDEX "payload_locked_documents_rels_club_applications_id_idx";
  DROP INDEX "payload_locked_documents_rels_digest_subscribers_id_idx";
  DROP INDEX "payload_locked_documents_rels_contact_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_advertising_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  ALTER TABLE "media" DROP COLUMN "creator";
  ALTER TABLE "media" DROP COLUMN "rights_category";
  ALTER TABLE "media" DROP COLUMN "licence_url";
  ALTER TABLE "media" DROP COLUMN "copyright_notice";
  ALTER TABLE "media" DROP COLUMN "usable_until";
  ALTER TABLE "media" DROP COLUMN "restrictions";
  ALTER TABLE "media" DROP COLUMN "evidence";
  ALTER TABLE "media" DROP COLUMN "sponsored_only";
  ALTER TABLE "users" DROP COLUMN "telegram_user_id";
  ALTER TABLE "users" DROP COLUMN "last_login_at";
  ALTER TABLE "users" DROP COLUMN "last_login_country";
  ALTER TABLE "users" DROP COLUMN "known_countries";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "articles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "authors_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rubrics_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tags_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "glossary_terms_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "institutions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "milestones_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "club_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "telegram_posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "club_applications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "digest_subscribers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contact_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "advertising_requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  DROP TYPE "public"."enum_articles_sources_type";
  DROP TYPE "public"."enum_articles_workflow_history_from";
  DROP TYPE "public"."enum_articles_workflow_history_to";
  DROP TYPE "public"."enum_articles_corrections_kind";
  DROP TYPE "public"."enum_articles_corrections_telegram_action";
  DROP TYPE "public"."enum_articles_workflow_status";
  DROP TYPE "public"."enum_articles_dueat_tz";
  DROP TYPE "public"."enum_articles_priority";
  DROP TYPE "public"."enum_articles_publishedat_tz";
  DROP TYPE "public"."enum_articles_firstpublishedat_tz";
  DROP TYPE "public"."enum_articles_significantupdateat_tz";
  DROP TYPE "public"."enum_articles_scheduledat_tz";
  DROP TYPE "public"."enum_articles_embargo_until_tz";
  DROP TYPE "public"."enum_articles_second_read_dueat_tz";
  DROP TYPE "public"."enum_articles_second_read_outcome";
  DROP TYPE "public"."enum_articles_change_note_kind";
  DROP TYPE "public"."enum_articles_sponsored_category";
  DROP TYPE "public"."enum_articles_sponsored_campaignstart_tz";
  DROP TYPE "public"."enum_articles_sponsored_campaignend_tz";
  DROP TYPE "public"."enum_articles_needs_legal";
  DROP TYPE "public"."enum_articles_needs_picture";
  DROP TYPE "public"."enum_articles_age_mark";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum_articles_translation_status";
  DROP TYPE "public"."enum__articles_v_version_sources_type";
  DROP TYPE "public"."enum__articles_v_version_workflow_history_from";
  DROP TYPE "public"."enum__articles_v_version_workflow_history_to";
  DROP TYPE "public"."enum__articles_v_version_corrections_kind";
  DROP TYPE "public"."enum__articles_v_version_corrections_telegram_action";
  DROP TYPE "public"."enum__articles_v_version_workflow_status";
  DROP TYPE "public"."enum__articles_v_version_dueat_tz";
  DROP TYPE "public"."enum__articles_v_version_priority";
  DROP TYPE "public"."enum__articles_v_version_publishedat_tz";
  DROP TYPE "public"."enum__articles_v_version_firstpublishedat_tz";
  DROP TYPE "public"."enum__articles_v_version_significantupdateat_tz";
  DROP TYPE "public"."enum__articles_v_version_scheduledat_tz";
  DROP TYPE "public"."enum__articles_v_version_embargo_until_tz";
  DROP TYPE "public"."enum__articles_v_version_second_read_dueat_tz";
  DROP TYPE "public"."enum__articles_v_version_second_read_outcome";
  DROP TYPE "public"."enum__articles_v_version_change_note_kind";
  DROP TYPE "public"."enum__articles_v_version_sponsored_category";
  DROP TYPE "public"."enum__articles_v_version_sponsored_campaignstart_tz";
  DROP TYPE "public"."enum__articles_v_version_sponsored_campaignend_tz";
  DROP TYPE "public"."enum__articles_v_version_needs_legal";
  DROP TYPE "public"."enum__articles_v_version_needs_picture";
  DROP TYPE "public"."enum__articles_v_version_age_mark";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum__articles_v_version_translation_status";
  DROP TYPE "public"."enum_authors_status";
  DROP TYPE "public"."enum__authors_v_version_status";
  DROP TYPE "public"."enum__authors_v_published_locale";
  DROP TYPE "public"."enum_rubrics_slug";
  DROP TYPE "public"."enum_rubrics_status";
  DROP TYPE "public"."enum__rubrics_v_version_slug";
  DROP TYPE "public"."enum__rubrics_v_version_status";
  DROP TYPE "public"."enum__rubrics_v_published_locale";
  DROP TYPE "public"."enum_tags_status";
  DROP TYPE "public"."enum__tags_v_version_status";
  DROP TYPE "public"."enum__tags_v_published_locale";
  DROP TYPE "public"."enum_media_rights_category";
  DROP TYPE "public"."enum_glossary_terms_category";
  DROP TYPE "public"."enum_glossary_terms_status";
  DROP TYPE "public"."enum_glossary_terms_translation_status";
  DROP TYPE "public"."enum__glossary_terms_v_version_category";
  DROP TYPE "public"."enum__glossary_terms_v_version_status";
  DROP TYPE "public"."enum__glossary_terms_v_published_locale";
  DROP TYPE "public"."enum__glossary_terms_v_version_translation_status";
  DROP TYPE "public"."enum_institutions_status_history_status";
  DROP TYPE "public"."enum_institutions_type";
  DROP TYPE "public"."enum_institutions_licence_status";
  DROP TYPE "public"."enum_institutions_status";
  DROP TYPE "public"."enum_institutions_translation_status";
  DROP TYPE "public"."enum__institutions_v_version_status_history_status";
  DROP TYPE "public"."enum__institutions_v_version_type";
  DROP TYPE "public"."enum__institutions_v_version_status";
  DROP TYPE "public"."enum__institutions_v_published_locale";
  DROP TYPE "public"."enum__institutions_v_version_translation_status";
  DROP TYPE "public"."enum_milestones_milestone_status";
  DROP TYPE "public"."enum_milestones_status";
  DROP TYPE "public"."enum_milestones_translation_status";
  DROP TYPE "public"."enum__milestones_v_version_status";
  DROP TYPE "public"."enum__milestones_v_published_locale";
  DROP TYPE "public"."enum__milestones_v_version_translation_status";
  DROP TYPE "public"."enum_club_events_startsat_tz";
  DROP TYPE "public"."enum_club_events_endsat_tz";
  DROP TYPE "public"."enum_club_events_registrationclosesat_tz";
  DROP TYPE "public"."enum_club_events_status";
  DROP TYPE "public"."enum_club_events_translation_status";
  DROP TYPE "public"."enum__club_events_v_version_startsat_tz";
  DROP TYPE "public"."enum__club_events_v_version_endsat_tz";
  DROP TYPE "public"."enum__club_events_v_version_registrationclosesat_tz";
  DROP TYPE "public"."enum__club_events_v_version_status";
  DROP TYPE "public"."enum__club_events_v_published_locale";
  DROP TYPE "public"."enum__club_events_v_version_translation_status";
  DROP TYPE "public"."enum_requests_kind";
  DROP TYPE "public"."enum_requests_receivedat_tz";
  DROP TYPE "public"."enum_requests_channel";
  DROP TYPE "public"."enum_requests_status";
  DROP TYPE "public"."enum_requests_decision";
  DROP TYPE "public"."enum_telegram_posts_kind";
  DROP TYPE "public"."enum_telegram_posts_status";
  DROP TYPE "public"."enum_telegram_posts_sendat_tz";
  DROP TYPE "public"."enum_club_applications_interests";
  DROP TYPE "public"."enum_club_applications_sector";
  DROP TYPE "public"."enum_club_applications_size";
  DROP TYPE "public"."enum_club_applications_status";
  DROP TYPE "public"."enum_club_applications_source_locale";
  DROP TYPE "public"."enum_club_applications_consent_locale";
  DROP TYPE "public"."enum_digest_subscribers_locale";
  DROP TYPE "public"."enum_digest_subscribers_status";
  DROP TYPE "public"."enum_digest_subscribers_source_locale";
  DROP TYPE "public"."enum_digest_subscribers_consent_locale";
  DROP TYPE "public"."enum_contact_messages_topic";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_contact_messages_source_locale";
  DROP TYPE "public"."enum_contact_messages_consent_locale";
  DROP TYPE "public"."enum_advertising_requests_format";
  DROP TYPE "public"."enum_advertising_requests_budget";
  DROP TYPE "public"."enum_advertising_requests_status";
  DROP TYPE "public"."enum_advertising_requests_source_locale";
  DROP TYPE "public"."enum_advertising_requests_consent_locale";
  DROP TYPE "public"."enum_users_declared_interests_nature";
  DROP TYPE "public"."enum_publish_events_kind";
  DROP TYPE "public"."enum_publish_events_change_kind";
  DROP TYPE "public"."enum_publish_events_status";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_redirects_type";
  DROP TYPE "public"."enum_payload_query_presets_access_read_constraint";
  DROP TYPE "public"."enum_payload_query_presets_access_update_constraint";
  DROP TYPE "public"."enum_payload_query_presets_access_delete_constraint";
  DROP TYPE "public"."enum_payload_query_presets_related_collection";
  DROP TYPE "public"."enum_home_page_pinned_until_tz";
  DROP TYPE "public"."enum_home_page_breaking_until_tz";
  DROP TYPE "public"."enum_home_page_status";
  DROP TYPE "public"."enum__home_page_v_version_pinned_until_tz";
  DROP TYPE "public"."enum__home_page_v_version_breaking_until_tz";
  DROP TYPE "public"."enum__home_page_v_version_status";
  DROP TYPE "public"."enum__home_page_v_published_locale";
  DROP TYPE "public"."enum_navigation_header_kind";
  DROP TYPE "public"."enum_navigation_header_page";
  DROP TYPE "public"."enum_navigation_footer_items_kind";
  DROP TYPE "public"."enum_navigation_footer_items_page";
  DROP TYPE "public"."enum_navigation_status";
  DROP TYPE "public"."enum__navigation_v_version_header_kind";
  DROP TYPE "public"."enum__navigation_v_version_header_page";
  DROP TYPE "public"."enum__navigation_v_version_footer_items_kind";
  DROP TYPE "public"."enum__navigation_v_version_footer_items_page";
  DROP TYPE "public"."enum__navigation_v_version_status";
  DROP TYPE "public"."enum__navigation_v_published_locale";
  DROP TYPE "public"."enum_ad_slots_slots_slot_id";
  DROP TYPE "public"."enum_ad_slots_slots_format";
  DROP TYPE "public"."enum_ad_slots_slots_category";
  DROP TYPE "public"."enum_ad_slots_slots_startsat_tz";
  DROP TYPE "public"."enum_ad_slots_slots_endsat_tz";
  DROP TYPE "public"."enum_ad_slots_slots_age_mark";
  DROP TYPE "public"."enum_ad_slots_status";
  DROP TYPE "public"."enum__ad_slots_v_version_slots_slot_id";
  DROP TYPE "public"."enum__ad_slots_v_version_slots_format";
  DROP TYPE "public"."enum__ad_slots_v_version_slots_category";
  DROP TYPE "public"."enum__ad_slots_v_version_slots_startsat_tz";
  DROP TYPE "public"."enum__ad_slots_v_version_slots_endsat_tz";
  DROP TYPE "public"."enum__ad_slots_v_version_slots_age_mark";
  DROP TYPE "public"."enum__ad_slots_v_version_status";
  DROP TYPE "public"."enum__ad_slots_v_published_locale";
  DROP TYPE "public"."enum_site_settings_telegram_invite_links_placement";
  DROP TYPE "public"."enum_site_settings_legal_age_mark_value";
  DROP TYPE "public"."enum_site_settings_emergency_level";
  DROP TYPE "public"."enum__site_settings_v_version_telegram_invite_links_placement";
  DROP TYPE "public"."enum__site_settings_v_version_legal_age_mark_value";
  DROP TYPE "public"."enum__site_settings_v_version_emergency_level";
  DROP TYPE "public"."enum_editorial_rules_return_phrases_locale";
  DROP TYPE "public"."enum__editorial_rules_return_phrases_v_locale";`)
}
