# How major newsrooms build, run and secure their CMS — and what Muomalat should do

Prepared 9 October 2026 for Muomalat's founder, editor-in-chief and developer.
The build specification that follows from this research is [CMS-SPEC.md](./CMS-SPEC.md).

**How to read this document**

- A *CMS* (content management system) is the private back office where journalists write, edit and publish. Readers never see it. Muomalat's reader-facing site already exists; this document is about the back office behind it.
- A claim taken from a source carries a link. *(inference)* marks our own reasoning. *(unverified)* marks something seen only second-hand, in a search summary, or on a page we could not open. Old sources carry their date: what a newsroom did in 2013 may not be what it does now.
- Method: eight researchers worked on 8–9 October 2026, each on one area (NYT and Washington Post, Guardian and BBC, financial newsrooms, CMS platforms, editorial workflow, security, Uzbek law, Telegram). Several primary sites (the NYT engineering blog, washingtonpost.com, theguardian.com, bbc.co.uk, Medium) blocked automated reading. Where that happened we used the outlets' own open-source code, their vendors' documentation, or reputable secondary coverage, and we say so. On 9 October the lead architect re-checked the Payload security advisories (GitHub API and npm registry) and Cloudflare's purge and Zero Trust plan limits.

---

## Executive summary

1. **Decision: run Payload CMS 3 (version 3.90.2 or later) inside the existing Next.js app, on PostgreSQL, on one Hostinger VPS in an EU region, behind Cloudflare.** Payload is open source (MIT), costs no licence fee, keeps the content in our own database, and fits the current stack (Next 16.4, React 19.3) ([npm](https://registry.npmjs.org/payload)). The Guardian moved its own CMS database to PostgreSQL in 2018 ([InfoQ](https://www.infoq.com/news/2019/01/guardian-mongodb-postgresql/)). Vox Media's experience shows that building a CMS from scratch is the expensive option ([Axios](https://www.axios.com/2023/07/18/vox-media-chorus)).
2. **Payload gives us drafts, version history, autosave, document locking, scheduling, languages and field-level permissions. It does not give us an approval workflow, two-factor login or an audit log.** In Payload those three are paid Enterprise features ([Payload Enterprise](https://payloadcms.com/enterprise)). We build them ourselves with fields and hooks, and put two-factor login in front of the admin with Cloudflare Access. This is the main build cost.
3. **No story is first published by the person who wrote it.** An editor or the editor-in-chief who is not the author publishes it. This is Reuters' "second pair of eyes" rule ([Reuters Handbook, 2009](https://mediakar.wordpress.com/wp-content/uploads/2012/10/handbook-of-journalism-reuters.pdf)), and it matches Uzbek law, which makes the editor-in-chief responsible for every release ([Law on Mass Media, Art. 16 and 26](https://lex.uz/docs/-1106870)). Higher-risk stories also need the editor-in-chief: legal risk, a single anonymous source, sponsored content, and withdrawals. For breaking news from an official source there is a fast path: the story goes out first and gets a mandatory second read within 30 minutes.
4. **Content stays structured, never stored as HTML.** The NYT, the Washington Post's Arc XP and the BBC all store stories as typed blocks ([NYT Oak](https://github.com/xitu/gold-miner/blob/master/TODO1/building-a-text-editor-for-a-digital-first-newsroom.md), [Arc ANS](https://docs.arcxp.com/en/products/content/getting-started-with-ans.html), [BBC Optimo data](https://github.com/bbc/simorgh/tree/latest/data/uzbek/articles/cxj3rjxm6r0o)). Muomalat's `ArticleBlock` model already does this. The CMS keeps it, and adds two things: every chart and table must name its source before publication, and stories are linked to the institutions they are about.
5. **Mistakes are corrected in public, specifically, and permanently.** Every change to a published story must be classified: minor fix, update, correction, clarification or editor's note. A changed number or name is always a correction, never a silent edit. Correction notes cannot be deleted. Published stories are never deleted; a withdrawal keeps the page and shows a notice. These rules come from Reuters, the Washington Post and the NYT ([Reuters Handbook](https://mediakar.wordpress.com/wp-content/uploads/2012/10/handbook-of-journalism-reuters.pdf), [WaPo 2013 memo](https://www.poynter.org/?p=200844), [NYT standards](https://www.nytimes.com/editorial-standards/ethical-journalism.html)). A correction is also posted to Telegram.
6. **Sponsored content must carry the word "Reklama".** Uzbek advertising law requires paid editorial material to sit under a «Реклама» heading ([ZRU-776, Art. 18](https://lex.uz/uz/docs/-6052631)). The Competition Committee repeated this in September 2026 ([Spot](https://www.spot.uz/ru/2026/09/03/ad-regulations/)). The current label, "Hamkorlik materiali" ("Partner content"), is probably not enough on its own. In the CMS the commercial desk can prepare sponsored items but never publish them. Ads for financial services need the advertiser's licence, a risk warning, and no promise of returns (Art. 42–43). Ad records are kept for 3 years (Art. 15).
7. **The most likely serious incident is a hijacked staff account publishing a fake story that is then pushed automatically to Telegram.** That is how the PAP 2024 and LIGA.net 2024 incidents unfolded ([Notes from Poland](https://notesfrompoland.com/2024/05/31/fake-polish-press-agency-reports-on-sending-troops-to-ukraine-blamed-on-russian-hackers/), [IMI](https://imi.org.ua/en/news/someone-hacks-the-liga-net-website-posts-russian-disinformation-on-avdiivka-i59293)). Uzbek journalists' Telegram channels have been hijacked in 2025–26 ([Uzbek Forum](https://www.uzbekforum.org/digital-attacks-silence-independent-uzbek-journalists-and-government-critics/)). The controls:
   - the admin is never reachable from the public internet; it sits behind Cloudflare Access and hardware security keys;
   - every Telegram post is reviewed and leaves through a short delay that can be cancelled;
   - alerts go to a channel the attacker cannot erase;
   - the channel's owner account lives on a dedicated phone and SIM.
8. **Patching is a weekly job, not an occasional one.** Payload published 49 security advisories in 2026, 8 of them critical, including 22 on the day 3.90.0 shipped (18 September) ([GitHub advisories](https://github.com/payloadcms/payload/security/advisories), checked 9 October). Next.js 16 has had several bypass and remote-code-execution fixes this year. Budget a few hours a week. Critical fixes go out within 48 hours. Payload's API is never exposed on the public site.
9. **Hosting in the EU is now legal for our data; registration comes first.**
   - In March 2026 Uzbekistan rewrote its data-localisation rule. Only biometric, genetic and telecom-subscriber data must now stay in the country. Other personal data may go to the 49 countries on the Cabinet's list, which includes Lithuania and Germany ([ZRU-1125 report](https://kun.uz/ru/news/2026/03/28/xraneniye-nekotoryx-personalnyx-dannyx-za-predelami-uzbekistana-razresheno), [Resolution 415](https://lex.uz/uz/docs/8369688)).
   - Use Hostinger's Lithuania or Germany region, not India, Malaysia, Indonesia or the US, and have counsel confirm before launch.
   - Muomalat must be registered as an online mass-media outlet before it presents itself as one. Register all four editions at once. Show the legal imprint on the home page, and answer refutation and reply requests within one month ([Law on Mass Media](https://lex.uz/docs/-1106870)).
10. **Uzbek Latin is the source language.** Cyrillic is generated automatically, as BBC Uzbek does with one article shown in two scripts ([Simorgh uzbek.ts](https://github.com/bbc/simorgh/blob/latest/src/app/lib/config/services/uzbek.ts)), with an editable exceptions list. Russian and English are optional translations. One person translates, a second approves, and only then does the translation go live. A machine translation is never published without human review: Bloomberg's AI summaries needed at least 36 corrections in their first ten weeks ([Talking Biz News](https://talkingbiznews.com/media-news/bloomberg-has-a-rocky-start-with-ai-summaries/)).

---

## 1. How the big newsrooms do it

### 1.1 The New York Times: Scoop (back end) and Oak (editor)

What they built:

- **Scoop**, an in-house "headless" CMS from about 2008. It manages content and hands it to other apps that build the pages ([Nieman Lab 2014](https://www.niemanlab.org/2014/06/heres-the-scoop-looking-under-the-hood-of-the-new-york-times-content-management-system/), seen via search excerpts; [NYU summary](https://nyujournalismprojects.org/futurenytimes/ffis-2/web-development/)). By 2020 it was a set of Java services on Kubernetes, with secrets in a self-hosted Vault ([smoores.dev, 2020](https://smoores.dev/post/dockerizing_legacy_scoop/)).
- **Oak**, an editor built on ProseMirror and React, chosen in 2017. It is "used by over a thousand journalists… to author nearly every story" ([smoores.dev, 2025](https://smoores.dev/post/why_i_rebuilt_prosemirror_view/)).
  - The editor shares components with the reader site, so a story looks in Oak as it will when published.
  - A schema decides where each element may appear ("we don't want users putting an embedded tweet in the header"). It also decides which formatting each element accepts: links and italics are allowed in subheads but not in the main headline.
  - Comments and track changes are built in.
  - Source: [2018 article, read in translation](https://github.com/xitu/gold-miner/blob/master/TODO1/building-a-text-editor-for-a-digital-first-newsroom.md). The original NYT blog post was blocked.
- **"Stashed text"** lets editors leave notes in a story that never publish ([Karina Nguyen](https://karinanguyen.com/projects/oak/)).
- **Training inside the editor.** Tooltips and guidance in Oak trained a 1,700-person newsroom ([Nieman Lab 2021](https://www.niemanlab.org/reading/to-train-a-1700-person-newsroom-the-new-york-times-added-tooltips-and-guidance-to-the-cms/)).
- **The publishing log (2017).** Every published asset since 1851 lives in one ordered log of under 100 GB ([Confluent blog by NYT's Boerge Svingen](https://www.confluent.io/blog/publishing-apache-kafka-new-york-times/)). Each publish passes a schema check and gets a message ID. When an image changes, every story that uses it is republished.

What it teaches Muomalat:

- **Take:** keep the schema-checked block body. Limit formatting per block: plain headline; bold, italic, links and glossary links in paragraphs; no links in pull quotes. Write help text in Uzbek inside the admin. Keep internal notes in a field that is never rendered. Keep a publish log, so that when an author, glossary term or image changes, every story that uses it is refreshed (the "Monolog-lite" in the spec).
- **Skip:** real-time collaborative editing, Kafka and microservices. These are built for 1,000+ journalists. For 5–10 people, one editor at a time with a lock is enough (Arc XP sells exactly that; see 1.2).
- **Caveat:** the NYT's roles and permission matrix are not public. The sources are 2017–2020 and partly second-hand.

### 1.2 The Washington Post: Arc XP

What they built:

- **Origins.** From 2013 WaPo separated rendering from content: first PageBuilder, then the ANS content format. Planning (WebSked), video and A/B-testing tools followed, and the platform was sold to other publishers as Arc XP ([RJI 2016](https://rjionline.org/news/how-the-washington-post-built-a-publishing-platform-accidentally-on-purpose/)).
- **Business.** Arc lost money; 54 staff were laid off in 2024 ([Axios](https://www.axios.com/2024/09/23/wapo-lays-off-54-people-at-publishing-tech-arm-arc-xp)). Prices are not public.
- **Log-in is handed to the newsroom's identity provider** (Okta, Entra ID, Google) over SAML. Users exist only there; Arc maps groups to roles and websites ("squads"). MFA is enforced in the identity provider, and access from abroad can be blocked there ([Arc permissions](https://docs.arcxp.com/en/products/arc-xp-administration/permissions.html), [Okta setup](https://docs.arcxp.com/en/products/arc-xp-administration/permissions/integrating-arc-xp-with-okta.html), [country blocking](https://docs.arcxp.com/en/knowledge-articles/administration/how-do-i-block-access-to-applications-from-outside-our-country-.html)).
- **API tokens never expire.** They must be revoked by hand when someone leaves ([Arc tokens](https://docs.arcxp.com/en/products/arc-xp-administration/developer-center/managing-access-tokens.html)).
- **Composer**, the story editor:
  - **Separate dates.** The publish time and the displayed time are separate, so a republish after a typo fix keeps the original date. Stories can be set to expire.
  - **Separate notes.** Inline notes never publish, there is a suggesting mode, and internal memos record things like embargo dates.
  - **Validation rules.** Errors block publishing; warnings can be acknowledged ([story editing](https://docs.arcxp.com/en/products/composer/getting-started-with-composer/creating-and-editing-stories.html), [collaboration](https://docs.arcxp.com/en/products/composer/getting-started-with-composer/collaborating-within-composer.html), [validation rules](https://docs.arcxp.com/en/products/composer/getting-started-with-composer/how-to-use-story-validation-rules-service-in-composer.html)).
  - **One editor at a time,** with an idle timeout ([live blogging](https://docs.arcxp.com/en/products/composer/getting-started-with-composer/implementing-live-blogging-in-arc-xp.html)).
- **Revision history has gaps.** It keeps 100 versions but does not track corrections, authors, scheduling or workflow-status changes ([revision history](https://docs.arcxp.com/en/products/composer/getting-started-with-composer/using-revision-history.html)). Finding out who deleted a story needs a support ticket ([Arc](https://docs.arcxp.com/en/knowledge-articles/composer/how-can-i-determine-who-deleted-an-article-in-composer.html)).
- **Workflow statuses are only labels.** "No events (like save and publish) automatically trigger a change in the workflow status" ([Arc statuses](https://docs.arcxp.com/en/products/composer/getting-started-with-composer/how-to-setup-workflow-statuses.html)). The default set is Draft, Edit, Publish, and Arc advises starting with few statuses. A status change can create a task for a group, with a deadline in minutes, and notify it by Slack or email ([task triggers](https://docs.arcxp.com/en/products/websked/configuring-websked-settings/configuring-websked-groups/configuring-group-task-triggers.html)). Customers report stories "published while status still says in progress" *(unverified; Arc ideas portal via search)*.
- **Shared preview links leak.** They are risky because the CDN caches them ([Arc preview](https://docs.arcxp.com/en/knowledge-articles/composer/share-preview-of-stories-externally.html)).
- **Corrections policy (2013 memo by Marty Baron and two other editors):**
  - Fix the story and append "Correction: An earlier version of this story incorrectly reported…".
  - "We should never 'unpublish' stories"; removal needs a senior editor and an editor's note at the same URL.
  - Clarifications need the editor-in-chief or a managing editor.
  - Reporters do not ask producers to fix substantive errors; an editor does.
  - Source: [Poynter](https://www.poynter.org/?p=200844). This is a 2013 policy; the current one could not be fetched.

What it teaches Muomalat:

- **Take:**
  - separate first-publication, display and "significant update" dates;
  - publish-time validation split into errors and warnings;
  - document locking with an idle warning;
  - internal notes;
  - log-in handled outside the CMS (Cloudflare Access plays the identity-provider role);
  - no non-expiring all-powerful tokens;
  - an audit log that covers exactly what Arc's history leaves out (corrections, authors, status, scheduling, deletion).
- **Adapt:** Arc statuses are only labels. Ours drive the rules: a hook blocks publishing unless the story is approved, and moves the status automatically on publish.
- **Skip:** Arc itself (enterprise price), multi-site squads, page-builder layouts and print integration.

### 1.3 The Guardian: Composer, Workflow, Grid, Fronts

Most facts come from the Guardian's public code on GitHub, cloned 8 October 2026; the core Composer repository is private.

- **Workflow** tracks every piece "from commission to publication":
  - Statuses: `Writers → Desk → ProductionEditor → Subs → Revise → Final`, plus `Hold` ([Status.scala](https://github.com/guardian/workflow-frontend/blob/main/common-lib/src/main/scala/models/Status.scala)).
  - Each item has `needsLegal` and `needsPictureDesk` flags with three states (NA / Required / Complete). It also carries a due date, assignee, priority and a soft-delete "trashed" flag ([Stub.scala](https://github.com/guardian/workflow-frontend/blob/main/common-lib/src/main/scala/models/Stub.scala)).
  - Workflow status is kept separate from Composer's published state.
- **Content flags.** Items carry `legallySensitive`, `sensitive`, `isInappropriateForSponsorship`, `shouldHideAdverts`, `showInRelatedContent`, `scheduledPublicationDate` and `firstPublicationDate`. A record of old URLs (`aliasPaths`) gives redirects. Paid content is its own tag type ([content-api-models](https://github.com/guardian/content-api-models/blob/main/models/src/main/thrift/content/v1.thrift)).
- **History.** Each reusable "atom" records who did what and when for create, publish, take-down, schedule, embargo and expiry, with a revision counter ([contentatom.thrift](https://github.com/guardian/content-atom/blob/main/thrift/src/main/thrift/contentatom.thrift)).
  - A snapshot service stores both the live and preview versions every five minutes ([flexible-snapshotter](https://github.com/guardian/flexible-snapshotter)).
  - Restoring a version needs a specific permission, `restore_content` ([flexible-restorer](https://github.com/guardian/flexible-restorer)).
- **Grid**, the image system ([UsageRights.scala](https://github.com/guardian/grid/blob/main/common-lib/src/main/scala/com/gu/mediaservice/model/UsageRights.scala), [leases](https://github.com/guardian/grid/blob/main/common-lib/src/main/scala/com/gu/mediaservice/model/leases/MediaLease.scala)):
  - Every image has a rights category, such as staff, agency, handout, screengrab, social media, Creative Commons or public domain. An image with no rights shows "You cannot use this image in content!"
  - Time-limited leases allow or deny use of a specific image.
  - Usage is tracked, so each image shows where it appears.
  - Its stated principle: "Access controls should be reduced to a minimum, while accounting of usage should be given high visibility" ([Grid vision](https://github.com/guardian/grid/blob/main/docs/00-about/01-vision.md)).
- **Permissions** are named yes/no capabilities rather than broad roles ([facia-tool](https://github.com/guardian/facia-tool/blob/main/app/permissions/Permissions.scala), [tagmanager](https://github.com/guardian/tagmanager/blob/main/app/permissions/Permissions.scala)):
  - Editing the homepage is separate from launching it: `edit_editorial_fronts` versus `launch_editorial_fronts`.
  - Commercial fronts and commercial tags have their own permissions.
  - Sending breaking-news alerts is its own permission.
- **Log-in and accounts:**
  - One signed cookie works across all tools, and two-factor sign-in can be checked ([pan-domain-authentication](https://github.com/guardian/pan-domain-authentication)).
  - Access to the cloud servers is temporary and audited ([Janus](https://github.com/guardian/janus-app)).
  - A "credentials reaper" disables stale keys and leavers' accounts ([Security HQ](https://github.com/guardian/security-hq)).
- **Style and notes:**
  - Typerighter checks copy against the house style guide ([Typerighter](https://github.com/guardian/typerighter)).
  - Pinboard keeps discussion out of the article body, avoiding "the risk of being published accidentally" ([Pinboard](https://github.com/guardian/pinboard)).
- **Database.** Composer moved from MongoDB to PostgreSQL in 2018 for maturity and indexed JSON, with no downtime ([InfoQ](https://www.infoq.com/news/2019/01/guardian-mongodb-postgresql/)).

What it teaches Muomalat:

- **Take:**
  - three-state legal and picture flags that block publication while "Required";
  - sensitivity flags, including "not suitable next to sponsored content";
  - a history of old URLs for redirects;
  - rights categories, credit and an expiry date on every image, with a "used in" list;
  - separate permissions to edit and to launch the homepage;
  - separate commercial permissions;
  - house-style checks;
  - notes kept outside the body;
  - a specific permission to restore old versions.
- **Skip:** microservices, the Elasticsearch-based Grid, print integration, and building our own analytics (Ophan).

### 1.4 The BBC: Optimo, Simorgh and BBC Uzbek's two scripts

- **Optimo**, the BBC's newer CMS, stores stories as nested blocks: headline, then text, then paragraph, then fragment. Each block has an ID and a position, and each story has a `passport` holding language and tags ([BBC Uzbek test data](https://github.com/bbc/simorgh/tree/latest/data/uzbek/articles/cxj3rjxm6r0o)). The older CPS system still runs alongside it ([simorgh #4508](https://github.com/bbc/simorgh/issues/4508)).
- **One front end, Simorgh, serves 40+ language services** through per-service configuration ([Simorgh](https://github.com/bbc/simorgh)).
- **BBC Uzbek publishes each article in both `cyr` and `lat`** with the same article ID. The script switch changes only the end of the URL, and the BBC calls the feature "transliteration" ([uzbek.ts](https://github.com/bbc/simorgh/blob/latest/src/app/lib/config/services/uzbek.ts), [ScriptLink](https://github.com/bbc/simorgh/blob/latest/src/app/components/Header/ScriptLink/index.tsx)).
  - In 2025 it hid the switch on page types that cannot be transliterated, such as live pages ([PR 13227](https://github.com/bbc/simorgh/pull/13227)).
  - We infer that the Cyrillic version is generated, not written separately; we found no BBC description of the engine.
- **BBC Uzbek's apostrophes are inconsistent.** Its Latin interface strings use the wrong apostrophe (U+2018) 84 times and the correct oʻ letter (U+02BB) once (same file; counted by our researcher). Muomalat's validator already enforces the correct characters; the CMS keeps that.
- **Removal guidance (updated 23 June 2025)** ([BBC](https://www.bbc.co.uk/editorialguidelines/guidance/removal-online-content), read via a mirror):
  - News "should not normally be amended and should only be removed or hidden in exceptional circumstances."
  - A "right to be forgotten" does not usually outweigh the public interest.
  - Accurate court reports are very rarely removed.
- **Ofcom finding (2022).** The UK regulator found a BBC article stayed uncorrected for about eight weeks and did not link to the later correction *(unverified; search result)*.
- **AI translation.** The BBC is piloting it with human editing, with the aim of building it into the CMS ([Press Gazette](https://pressgazette.co.uk/publishers/digital-journalism/bbc-ai-translation-poland/)).
- **Reference design for script conversion.** MediaWiki converts Uzbek Latin and Cyrillic with layered conversion tables and markup that protects words from conversion ([LanguageConverter](https://www.mediawiki.org/wiki/Writing_systems/LanguageConverter)).

What it teaches Muomalat:

- **Take:** one article in two scripts, with Cyrillic generated from Latin. That is what `src/i18n/translit.ts` already does. The CMS adds:
  - an editable exceptions dictionary;
  - optional hand-written Cyrillic headline, lead and kicker for the rare case where transliteration is wrong;
  - a side-by-side Cyrillic preview;
  - a "Cyrillic checked" tick.

  Also take: removal is exceptional and the default is amend plus footnote, and any follow-up story links back to the corrected one.
- **Skip:** live pages for now.

### 1.5 Financial newsrooms: Reuters, Bloomberg, the FT

Most Reuters material comes from a 2009 copy of the *Reuters Handbook of Journalism* ([PDF](https://mediakar.wordpress.com/wp-content/uploads/2012/10/handbook-of-journalism-reuters.pdf)). The principles still hold; the current wording may differ.

- **Error classes, each with its own procedure:**
  - WITHDRAWN: the story is fundamentally wrong. It needs the desk and specialist editors, and an incident report.
  - CORRECTED: a substantive factual error.
  - REFILE: a minor error with "no bearing on any investment decision", published only by the most senior person on the desk.
  - REPEAT: the item is unchanged. Repeats "should never be used to overwrite mistakes."

  Further rules:

  - "Errors involving numbers almost always merit corrections."
  - Every correction carries a public note saying exactly what changed: "(Corrects paragraph 2, which erroneously described…)".
  - A story that may be wrong first gets an advisory, "report being checked".
- **Two people.** "Under no circumstances may a reporter file a story directly to clients without a 'second pair of eyes'." A story resting on a single anonymous source needs a supervisor's approval, recorded in the sign-off. Reuters tightened this after a discredited story in 2010 ([The Baron](https://thebaron.info/news/article/2010/02/06/reuters-editor-quits-over-discredited-story)).
- **Embargoes (Reuters):**
  - Copy is marked EMBARGOED in three places. The release time is entered as soon as the copy arrives. "Midnight" is banned in favour of 00:01.
  - Pending embargoes are passed on at shift handover.
  - An accidental early release is **not deleted**, because deletion "may give unfair advantage to those who spotted it". Instead Reuters issues an advisory and tells the source and, if needed, the regulator.
- **Real failures:**
  - Bloomberg sent a Federal Reserve minutes headline 24 minutes early in 2015 ([Talking Biz News](https://talkingbiznews.com/they-talk-biz-news/bloomberg-inadvertently-broke-embargo-on-fed-minutes/)).
  - Dow Jones published test data in 2017, including "Google to buy Apple", and Apple's share price moved ([Engadget](https://www.engadget.com/2017-10-10-dow-jones-reported-fake-story-google-buying-apple.html)).
  - Lesson: test content must never exist in production.
- **Sponsored separation:**
  - Bloomberg: "No Bloomberg journalist will participate in the production, editing or promotion of customized content." Sponsored work is labelled as advertising, uses different fonts and colours, and lives on a separate subdomain ([Bloomberg notice](https://www.bloomberg.com/notices/sponsor/), via search excerpts; [sponsored.bloomberg.com](https://sponsored.bloomberg.com/immersive/bms-2023)).
  - FT: branded content comes from a separate team and is marked "paid post" ([Talking Biz News](https://talkingbiznews.com/they-talk-biz-news/ft-to-publish-paid-posts/)).
  - Reuters' sponsored studio was criticised when a sponsored piece contradicted Reuters' own reporting ([The Baron](https://thebaron.info/news/article/2018/12/07/sponsored-content-supports-reuters-journalism)).
  - Politico removed sponsor branding from past newsletter editions after criticism ([Daily Caller](https://dailycaller.com/2021/09/03/politico-national-security-daily-lockheed-martin-sponsorship)).
- **Reader data stays away from journalists.** In 2013 Bloomberg reporters could see when terminal subscribers logged in. Bloomberg removed that access and appointed a compliance officer ([CBS](https://cbsnews.com/news/bloomberg-cuts-journalist-access-to-client-info)).
- **Conflicts of interest.** Reuters staff may not trade shares of a company they reported on in the previous month (handbook). The FT has kept an Investment Register since 2004 ([Leveson evidence](https://discoverleveson.com/evidence/Witness_Statement_of_Lisa_MacLeod/9048/media)).
- **Data visualisation (FT):**
  - FastCharts lets journalists make a bar or line chart "in under a minute".
  - A "Visual Vocabulary" guides the choice of chart.
  - Spark, the FT's own CMS, launched in 2020 ([FT Product & Technology](https://medium.com/ft-product-technology/rolling-out-a-cms-mid-pandemic-775d9ac45776), [zoomata](https://zoomata.com/archive/data-visualization-workflows-financial-times/)).

What it teaches Muomalat:

- **Take:**
  - a correction taxonomy, with a required public note ("Tuzatildi: 3-xatboshida 4,5 mlrd emas, 5,4 mlrd soʻm", meaning "Corrected: paragraph 3 now reads 5.4 bn soʻm, not 4.5 bn");
  - a number changed after publication is treated as a correction;
  - embargo as a hard lock, shown in three places in the admin;
  - no deleting an accidental early release;
  - staging kept separate from production;
  - a required source on every chart and table;
  - chart building from pasted data (bar and line only, so the 360 px layout never breaks);
  - commercial staff barred from editorial bylines, and journalists barred from sponsored bylines;
  - newsroom roles cannot read subscriber data;
  - a personal-interests register that warns when an author covers an institution they hold a stake in.
- **Skip:** wire-service mechanics (priority codes, machine-readable feeds, automated earnings stories). Muomalat has no trading clients.

### 1.6 Digital natives: Vox Media, Axios, Politico, Semafor

- **Vox Media's Chorus**, its own CMS, was licensed to other publishers from 2018. Vox stopped licensing it in 2022 and moved its own sites to WordPress VIP in 2023. WordPress's dominance made CMS licensing hard to compete in, and "the cost of maintaining a proprietary platform climbed" ([Axios](https://www.axios.com/2023/07/18/vox-media-chorus), [XWP case study](https://xwp.co/case-studies/vox-media/)).
- **Axios** built its own CMS "from scratch". Word count is displayed prominently. Axios experimented with hard limits but prefers to instil the principle in writers rather than block them ([INMA, undated](https://www.inma.org/blogs/newsroom-initiative/post.cfm/axios-publisher-shares-importance-of-culture-cms-local)). Its Smart Brevity rules include headlines under 60 characters ([Axios HQ](https://axioshq.com/hubfs/smart-brevity-101.pdf)).
- **Politico** moved to a headless Sanity CMS with a workflow board showing stages: draft, first edit, second edit ([Press Gazette, Sept 2026](https://pressgazette.co.uk/publishers/digital-journalism/how-politico-has-boosted-ai-innovation-by-moving-to-one-headless-cms/)). An arbitrator ruled against Politico for launching AI tools without the notice and human review its union contract required ([NewsGuild](https://newsguild.org/victory-politico-agrees-to-shut-down-both-ai-tools-at-center-of-landmark-arbitration)).
- **Semafor** splits stories into fixed sections: The News, The Reporter's View, Room for Disagreement, The View From, and Notable ([Semafor](https://www.semafor.com/article/10/18/2022/what-is-a-semaform-anyway-and-why-should-you-care)).

What it teaches Muomalat:

- **Take:**
  - use a maintained product rather than building our own;
  - nudge with soft checks: a live headline counter, a lead-length warning, an optional "Nima uchun muhim" ("Why it matters") box;
  - keep hard blocks for things with legal or safety weight: disclosure, sources, embargo;
  - a simple workflow board as a filtered list in the admin.
- **Adapt:** the Semafor-style split of facts from the reporter's view suits *tahlil* (analysis) and *izoh* (explainers) better than every news item.

### 1.7 Uzbek peers

Our researcher read each site's HTTP headers, network owners and footers on 8–9 October 2026. These describe front ends and hosting; their back-end CMSs are not public.

| Outlet | Front end and hosting | Editions | Notes |
|---|---|---|---|
| Kun.uz | Next.js behind Cloudflare | Latin default, `/kr`, `/ru`, `/en` (the same scheme as Muomalat) | Imprint with certificate number; Telegram @kunuzofficial, ~1.15M subscribers, posts in Cyrillic; short links `kun.uz/kr/<id>` |
| Daryo | Next.js behind Cloudflare, strict CSP | `/k/`, `/ru/`, `/en/` | Short links `daryo.uz/p/<id>` |
| Gazeta.uz | Custom PHP, Hetzner Germany | `/oz/` (Latin), `/uz/` (Cyrillic), `/ru/`, `/en/` | 18+ mark, "Matnda xato topdingizmi?" ("Found a typo?") tool, feedback bot |
| Spot.uz | Same PHP platform, Hetzner Germany | `/oz/`, `/ru/`, `/en/` | 18+, Ctrl+Enter error reporting, sponsored posts marked "(реклама)" |
| Podrobno.uz | 1C-Bitrix, hosted in Uzbekistan | Russian first | — |

- **Telegram post format.** In the 20 latest posts of each of the four big channels, nearly all were a photo with a caption and a bare link. There were no link previews, no buttons and no signatures ([t.me/s/kunuzofficial](https://t.me/s/kunuzofficial), [t.me/s/daryo](https://t.me/s/daryo), [t.me/s/gazetauz](https://t.me/s/gazetauz), [t.me/s/spotuz](https://t.me/s/spotuz)).
- **Hosting in Germany.** Gazeta and Spot hold user accounts in Germany. That fits the 2026 data law (section 4.3).

### 1.8 What they have in common

| Practice | Who does it | Muomalat |
|---|---|---|
| Structured block content, not HTML | NYT, Arc, BBC, Guardian | Keep `ArticleBlock`; Lexical editor with typed blocks |
| Editing separated from publishing | Guardian Fronts, WordPress "Submit for Review", Reuters | Two-person rule enforced in code |
| Few workflow states | Arc, Edit Flow, Guardian | 8 states (spec §5) |
| Public, specific, permanent corrections | Reuters, WaPo, NYT, Guardian | Append-only correction log, change classification |
| No silent removal | WaPo, BBC, Reuters | Withdraw with notice; editor-in-chief only |
| Rights on every image | Guardian Grid, Arc Photo Center | Rights category, credit, expiry, "used in" |
| Log-in outside the CMS, MFA | Arc (Okta), Guardian (Panda) | Cloudflare Access with security keys |
| Commercial separation in permissions | Guardian, Bloomberg, FT | Commercial role cannot publish; "Reklama" label |

---

## 2. Content management practices for Muomalat

### 2.1 Workflow states

Every off-the-shelf system uses a short, straight-line set of states:

- **Edit Flow** (WordPress plugin): Pitch, Assigned, Draft, Pending Review, Waiting for Feedback ([Edit Flow](https://editflow.org/features/custom-statuses/), plugin from about 2009).
- **VIP Workflow** (Automattic, beta): it adds a "Publish Guard" that blocks publishing "unless it has reached the last status on your list", plus a "Needs Legal Review" field ([vip-workflow-plugin](https://github.com/Automattic/vip-workflow-plugin)).
- **Arc XP**: Draft, Edit, Publish by default, with advice to start small ([Arc](https://docs.arcxp.com/en/products/websked/configuring-websked-settings/configuring-websked-workflow-statuses.html)).
- **Superdesk** (open-source newsroom system): separate states after publication for corrected, killed, recalled and unpublished items, and an embargo cannot be set in the past ([Superdesk](https://superdesk.readthedocs.io/en/latest/publish.html)).

**Muomalat uses eight states**, shown in Uzbek in the admin:

| State | Uzbek label | Meaning |
|---|---|---|
| `idea` | Gʻoya | Pitched or assigned, with an assignee and a deadline |
| `draft` | Qoralama | The author is writing |
| `in_edit` | Tahrirda | Submitted; an editor is working on it |
| `ready` | Tayyor | Approved by a second person; can be published or scheduled |
| `scheduled` | Rejalashtirilgan | Will publish automatically at a set time |
| `published` | Chop etilgan | Live |
| `hold` | Toʻxtatilgan | Parked or dropped |
| `withdrawn` | Olib tashlangan | Removed from circulation; the URL shows a notice |

Three design rules follow from what went wrong elsewhere:

- **Status drives the rules, not just the label.** Publishing is impossible unless the story is `ready`, so Arc's "published while still in progress" cannot happen.
- **The status moves automatically on publish and withdrawal.**
- **"Submit for edit" is one button** that saves, changes the status and closes the story. Arc users complained that saving and changing status were separate steps *(unverified)*.

Rare steps are flags, not states, following the Guardian. "Legal check needed" and "picture check needed" are each NA / Required / Complete, and publishing is blocked while either is Required.

### 2.2 Roles and the two-person rule

Roles. The pattern comes from WordPress and Ghost ([WordPress statuses](https://wordpress.org/documentation/article/post-status/), [Ghost staff roles](https://ghost.org/docs/staff)).

| Role | Uzbek | Can | Cannot |
|---|---|---|---|
| Reporter | Muxbir | Write and edit own or assigned drafts; submit for edit; propose corrections | Publish, schedule, edit others' drafts, see embargoed stories not assigned to them |
| Editor | Muharrir | Edit any editorial story; approve and publish stories they did not write; publish corrections and updates; curate the homepage; approve Telegram posts | Withdraw stories; sign off legal or sponsored items; manage users |
| Editor-in-chief | Bosh muharrir | Everything an editor can do, plus legal sign-off, sponsored approval, clarifications and editor's notes, withdrawals, legal hold, decisions on refutation and reply requests, the legal imprint | Manage users and technical settings |
| Commercial | Tijorat boʻlimi | Create and edit sponsored items and ad slots; handle advertising enquiries and club applications | Publish sponsored items; see unpublished journalism; remove the sponsored flag |
| Admin | Administrator | Users, roles, technical settings, integrations | Publish or edit editorial content (separation of duties) |

The two-person rule:

- **Basis:**
  - Reuters requires a "second pair of eyes" before anything reaches clients ([handbook](https://mediakar.wordpress.com/wp-content/uploads/2012/10/handbook-of-journalism-reuters.pdf)).
  - NPR requires senior-editor sign-off on major scoops and on stories with legal or ethical risk ([NPR memo, 2018](https://www.npr.org/sections/memmos/2018/12/11/675609079/reminder-senior-editors-must-sign-off-on-major-scoops-and-significant-stories), via search summary).
  - Optimizely added "Prevent users from approving their own changes" to its CMS for the same reason ([Optimizely](https://world.optimizely.com/blogs/alex-wang/dates/2018/8/four-eyes-approval)).
  - In Uzbekistan, the editor-in-chief permits each release (Law on Mass Media, Art. 26).
- **Muomalat rule:**
  - First publication must be done by an editor or the editor-in-chief who is not an author of the story and did not submit it.
  - If the story changes after approval, the approval is void.
  - The editor-in-chief must also sign off on:
    - stories flagged for legal review;
    - single-anonymous-source stories;
    - sponsored content;
    - clarifications, editor's notes and withdrawals.
- **Breaking-news fast path *(inference; we found no primary source describing one)*:**
  - An editor or the editor-in-chief may publish their own short news item if it rests on a named official source, such as a ministry or Central Bank release.
  - The system then requires a second read by another editor within 30 minutes, and escalates if it is missed.
  - Reporters cannot use the fast path.
  - This keeps the rule workable at night with 5–10 staff. Art. 40 of the media law also limits liability for errors taken from official communications ([lex.uz](https://lex.uz/docs/-1106870)).
- **The admin account does not publish.** The founder should use an editorial account day to day and a separate admin account only for user management.

### 2.3 After publication: updates, corrections, clarifications, withdrawals

What we take from others:

- **Reuters:** "We do not disguise or bury mistakes in subsequent updates" ([IFCN filing](https://mail.ifcncodeofprinciples.poynter.org/file/download/Yg35wFb6AghhmHHWwIBrzISVGFsfS1H2u98Zf8wH.docx)).
- **Silent rewrites get noticed.** The NYT public editor criticised one in 2016 ([Mediaite](https://www.mediaite.com/media/print/ny-times-public-editor-chastises-paper-for-stealth-editing-bernie-sanders-piece/)). Outside tools such as NewsDiffs and diffengine record such edits ([MITH](https://mith.umd.edu/tracking-changes-diffengine/)).
- **Google** wants "Published" and "Last updated" labels that match the structured data, and no artificially refreshed dates ([Google](https://developers.google.com/search/docs/appearance/publication-dates)).
- **Livingdocs** keeps a "significant update" date separate from ordinary saves ([Livingdocs](https://docs.livingdocs.io/guides/editor/publish-control/significant-update/)).

Every save of a published story must say what kind of change it is:

| Kind | Uzbek | Example | Public trace | Who may publish |
|---|---|---|---|---|
| Minor fix | Kichik tuzatish | Typo, broken link, formatting | None on the page; reason kept in history | Any editor (including the author, logged) |
| Update | Yangilash | New information added | "Yangilandi" (updated) time on the page | Any editor |
| Correction | Tuzatish | Wrong number, name, quote, attribution, institution tag | Correction note with date, saying exactly what was wrong; Telegram correction | Editor who is not an author |
| Clarification | Aniqlik kiritish | Accurate but misleading wording | Note | Editor-in-chief |
| Editor's note | Tahririyat izohi | No request for comment, unfair framing (NYT practice, [CJR](https://www.cjr.org/public_editor/nyt-correction-factual-errors-editors-note.php)) | Note at the top | Editor-in-chief |
| Withdrawal | Olib tashlash | Fundamentally wrong, legal order, safety | Page kept with a notice; removed from lists and search | Editor-in-chief |

Rules:

- If any number in the headline, lead or body changed and the change is marked "minor", the system blocks the save and asks for a correction (Reuters' numbers rule).
- Correction notes are append-only.
- A correction marks any Russian or English translation as out of date and hides it until it is fixed, so readers never see the old error in another language.
- There is a public "Tuzatishlar" (corrections) list.
- For serious errors, the note goes at the top. A Reuters 2011 practice was to strike the wrong passage through rather than delete it ([Poynter](https://www.poynter.org/reporting-editing/2011/reuters-to-change-how-it-handles-retractions-after-killing-david-cay-johnston-column-on-news-corp)).

### 2.4 Requests from outside: refutation, reply, removal

- **Uzbek law** (Law on Mass Media, Art. 34, [lex.uz](https://lex.uz/docs/-1106870)):
  - A person can demand a **refutation** (*raddiya*) of untrue information that harms their honour, dignity or business reputation.
  - Anyone whose rights were harmed has a **right of reply** (*javob*).
  - Either one appears on the same page as the original, under a special heading, within one month for electronic media.
  - If the outlet refuses or misses the deadline, the person can sue.
  - ARTICLE 19 criticised the duty as too broad ([ARTICLE 19](https://www.article19.org/resources/uzbekistan-law-on-mass-media/)).
- **Removal requests:**
  - The BBC rarely removes content (section 1.4).
  - The Boston Globe's "Fresh Start" takes requests through a form and a committee. Outcomes are an update, anonymisation or de-indexing ([Boston Globe](https://www.bostonglobe.com/2021/01/22/metro/globes-fresh-start-initiative-frequently-asked-questions)).
  - The University of Wisconsin's journalism ethics centre recommends a written policy with a decision roadmap ([UW ethics](https://ethics.sjmc.wisc.edu/creating-an-unpublishing-policy/)).
- **Muomalat:**
  - One "Murojaatlar" (requests) register covers reader error reports, refutation, reply and removal requests.
  - Each request has a received date and an automatic deadline (one month for refutation and reply), and is decided by the editor-in-chief.
  - Outcomes run from lightest to heaviest: no change → correction → reply block on the article → anonymise → hide from search → withdraw with notice.
  - The story is not hidden while a request is considered unless there is a legal reason.
  - The reader "found an error?" button that Gazeta and Spot use feeds the same register. It also supports the duty to remove inaccurate information "immediately" (Law on Informatisation, Art. 12¹, [lex.uz](https://lex.uz/docs/82956)).

### 2.5 Embargoes and scheduled publishing

- **An embargo is a lock; scheduling is a timer.**
  - Quintype and RebelMouse refuse to publish an embargoed story at all ([Quintype](https://help.quintype.com/en_US/articles/embargo), [RebelMouse](https://www.rebelmouse.com/article-embargo)).
  - Livingdocs supports both open-ended and dated embargoes ([Livingdocs](https://docs.livingdocs.io/guides/editor/publish-control/embargo/)).
- **Muomalat:**
  - Fields: embargo until (Tashkent time, with UTC shown alongside), or "indefinite".
  - The embargo source and a note.
  - Publishing, Telegram posting and newsletter inclusion are all refused while the embargo is active.
  - Scheduling for a time at or after the embargo is allowed.
  - Embargoed drafts are visible only to the people assigned and to editors.
  - The admin shows the embargo in three places: list badge, editor banner, title prefix.
  - An accidental early release is not deleted; an advisory goes out (the Reuters rule).
  - Pending embargoes appear on a handover list.
- **Scheduling in Payload** needs a background job runner. Without one, "scheduled publish / unpublish jobs will never be executed" ([Payload drafts](https://payloadcms.com/docs/versions/drafts)).
  - Version 3.90 changed how scheduled jobs carry the scheduling user, and two 2026 advisories concerned scheduled publishing ([3.90.0 release](https://github.com/payloadcms/payload/releases/tag/v3.90.0); GHSA-mg7r-jhr9-m745, GHSA-2qw6-cm49-277x).
  - The spec therefore uses our own small scheduler, which re-checks approval and embargo at the moment of publishing.

### 2.6 Separating sponsored content from journalism

Muomalat already separates commercial material visually ([DESIGN.md](../DESIGN.md)): a brass frame for partner content, grey for ads, and partner items kept out of the home lists and "Koʻp oʻqilgan" (most read). The CMS adds separation in permissions and in law.

- **Who does what.**
  - Only the commercial role creates or edits partner items.
  - Partner items can only have the commercial byline. Editorial stories cannot have it.
  - The editor-in-chief approves and publishes, partly to check that the piece does not contradict Muomalat's own reporting (the Reuters Plus lesson, section 1.5).
- **Label.** It must contain "Reklama" in every edition, for example "Reklama · Hamkorlik materiali" (ZRU-776 Art. 18; section 4.2).
  - The Telegram post starts with "Reklama" on the first line. The first line shows in notifications, and Uzbek is the state language under Art. 6 *(inference)*.
  - Kun.uz puts "Реклама" after the link; Gazeta and Spot put "(реклама)" at the end (section 1.7).
- **Placement.**
  - Never in the homepage lead slot or the pinned items.
  - Never in related links, most-read or a news sitemap.
  - Never next to stories flagged "not suitable next to sponsored content" (the Guardian flag).
- **Financial advertisers** (banks, takaful, sukuk, investment):
  - the advertiser's licence number is required;
  - the risk warning is required;
  - key contract terms are required;
  - wording that promises returns is blocked (ZRU-776 Art. 42–43).
- **Records.** Sponsored items and every change to them are kept for 3 years and cannot be deleted (Art. 15).
- **Disclosures are never removed afterwards** (the Politico lesson, section 1.5).

### 2.7 Four editions: Latin source, Cyrillic generated, Russian and English translated

- **Uzbek Latin** is the source. It is the only language a story must have.
- **Cyrillic (`/kr`)** is produced at read time by `src/i18n/translit.ts` and is never stored as a separate language. The CMS adds:
  - an exceptions dictionary editable by the editor-in-chief (today's loanword list moves there);
  - optional Cyrillic overrides for headline, lead and kicker;
  - a Cyrillic preview;
  - the existing `{en:…}` protect markup, offered as a "keep in Latin" button.
- **Russian and English** are optional translated fields.
  - Each has a status: missing → machine draft → in edit → approved → out of date.
  - The translator and reviewer must be different people.
  - Only approved translations appear on the site; otherwise the page shows the Uzbek original with `lang="uz"`, as it does now.
  - Machine drafts are allowed as a starting point, and the engine is recorded internally. They are never published unreviewed (Bloomberg AI summaries and the Politico arbitration, section 1.6).
- **Payload's own "publish per language" switch is still Beta** ([Payload localization](https://payloadcms.com/docs/configuration/localization)). We do not depend on it; our translation status does the gating.
- **The Payload admin has no Uzbek interface.** It offers 44 languages, including Russian ([translations](https://github.com/payloadcms/payload/tree/3.x/packages/translations/src/languages)). Field labels and help text will be in Uzbek. The admin's own buttons will start in Russian or English until an Uzbek pack is written.

### 2.8 Telegram as the main distribution channel

- **Reach.** Telegram is Uzbekistan's main online news channel ([Internews 2024 via Kursiv](https://uz.kursiv.media/2024-05-01/issledovanie-internews-soczseti-v-uzbekistane-stanovyatsya-vse-bolee-populyarnymi/amp/)). One 2025 overview puts its reach at 76% ([UzDaily](https://www.uzdaily.uz/en/telegram-76-reach-youtube-no-1-e-commerce-on-the-rise-inside-uzbekistans-digital-landscape/), method not disclosed).
- **Post format.** Photo plus caption, 1024 characters at most ([Bot API 10.3](https://core.telegram.org/bots/api#sendphoto)). The caption is bold headline, lead, bare short link and rubric hashtag.
  - Bare links avoid the "Open this link?" alert Telegram shows for text links ([formatting options](https://core.telegram.org/bots/api#formatting-options)).
  - No buttons, no signatures. This is the local norm (section 1.7).
- **Short links.** `muomalat.uz/t/<code>` redirects to the article with UTM tags, so Telegram traffic can be counted. Telegram's in-app browser cannot be told apart by its user agent (Telegram iOS and Android source code, per our researcher).
- **Corrections on Telegram.** The bot edits the caption (`editMessageCaption`). For factual corrections it also replies with a "TUZATISH:" ("CORRECTION:") post, because edits do not notify subscribers *(inference)*.
- **Deleting old posts.** Bots can delete posts only within 48 hours ([deleteMessage](https://core.telegram.org/bots/api#deletemessage)). Older posts are edited into a retraction notice and deleted by hand.
- **Auto-posting is a risk multiplier.** On LIGA.net a fake story "was automatically shared on the outlet's X account" before editors removed it ([IMI](https://imi.org.ua/en/news/someone-hacks-the-liga-net-website-posts-russian-disinformation-on-avdiivka-i59293)). So:
  - every Telegram post needs approval from an editor who is not the author;
  - posts leave through a 3-minute delay that can be cancelled;
  - the bot holds only post, edit and delete rights.
- **Skip for now:**
  - Instant View templates: approval looks closed in practice ([seroperson 2025](https://seroperson.me/2025/01/03/making-website-telegram-instant-view-compatible/)).
  - Rich Messages in channels: channel support is undocumented.
  - Paid suggested posts: they cannot be edited ([Bot API](https://core.telegram.org/bots/api#message)), so a mislabelled ad could not be fixed.
  - `protect_content`: it blocks forwarding, which is how the channel spreads.

### 2.9 Images: rights, credit, alt text

- **Alt text.** Every image needs alt text in Uzbek, unless it is marked decorative. Charts carry their data in a table, which the site already renders ([W3C WAI](https://www.w3.org/WAI/tutorials/images/decision-tree/)). Russian and English alt text are optional and already modelled in `ImageRef.translations`.
- **Credit and rights.** A credit line and a rights category are required: staff, commissioned, agency, official handout, partner, Creative Commons (with a link), public domain, or unknown.
  - Unknown or expired rights block publication, following the Guardian's Grid.
  - These map to the licence fields Google reads (`creditText`, `creator`, `copyrightNotice`, `license`) ([Google](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)).
- **Upload formats.** Uploads are JPEG, PNG, WebP or AVIF only. SVG and XML uploads were the route for two 2026 Payload vulnerabilities, a stored-XSS and a same-origin script issue (GHSA-2pwp-2369-8fg3, GHSA-9qpg-3cf8-w33x). Location data (GPS) is stripped on upload *(inference: protects sources and photographers)*.

### 2.10 Structured financial content

- **Sources on data.** Every chart and table names its source before publication. The `source` field is optional in `ChartSpec` today; it becomes required.
- **Second-read numbers checklist** (Reuters pre-filing list):
  - mln vs mlrd;
  - parts that add up to the total;
  - percentages that sum to 100;
  - the period covered and the unit;
  - the day and date.
- **Entity links.** Stories link to `Institution` records as "about" (one) and "mentions" (several). Getting an institution wrong is a correction, like a wrong RIC at Reuters.
- **Market map status history.** Each licence status change is kept with its date and source link, so the map is auditable *(inference)*.

### 2.11 Planning and analytics (later)

- **Planning.** WebSked (Arc) and Edit Flow show that a planning list and a calendar cover most needs ([WebSked](https://arcxp.com/2023/05/19/content-planning-with-websked), [Edit Flow](https://editflow.org/features/)). In Payload this is a saved filtered list ("Query Presets", [Payload](https://payloadcms.com/docs/query-presets/overview)), plus a daily budget digest posted to the private staff Telegram group.
- **Analytics.** The FT's Lantern, the Guardian's Ophan and the NYT's Stela favour a few clear numbers per story (2014–2019 sources, possibly outdated; [Nieman Lab](https://niemanlab.org/2016/03/the-ft-is-launching-a-new-analytics-tool-to-make-metrics-more-understandable-for-its-newsroom)). The `views` field that drives "Koʻp oʻqilgan" must stop being editable. It will later be filled from privacy-friendly analytics hosted in the EU.

---

## 3. Security

### 3.1 What actually happens to newsrooms

| Incident | What failed | Lesson for Muomalat |
|---|---|---|
| AP Twitter, 2013: fake "explosions at the White House", Dow down ~143 points ([CBS](https://www.cbsnews.com/sanfrancisco/news/phony-tweet-from-hacked-ap-twitter-account-says-white-house-attacked/)) | Phishing of staff | The distribution account (for us, Telegram) is part of the publishing system |
| NYT DNS hijack, 2013 ([Dark Reading](https://www.darkreading.com/attacks-breaches/syrian-electronic-army-strikes-again-in-modern-day-defacement-)) | A registrar reseller's login was phished | Registrar account with security keys; DNSSEC; registry lock if offered |
| Outbrain widget, 2013: WaPo, Time and CNN pages redirected ([Graham Cluley](https://grahamcluley.com/washington-post-hacked-by-the-syrian-electronic-army/)) | Third-party script compromised | No third-party scripts in content; strict CSP |
| Reuters blogs, 2012: fake Syria stories under real bylines ([TheWrap](https://www.thewrap.com/media/article/reuters-blogging-platform-hacked-false-post-syria-rebels-50741)) | CMS compromise | Two-person publish; audit alerts |
| Ghostwriter, 2017–21: real articles replaced with fakes on Baltic and Polish sites ([Mandiant](https://cloud.google.com/blog/topics/threat-intelligence/ghostwriter-influence-campaign/)) | Stolen CMS credentials; spoofed emails | MFA; DMARC reject; versions to roll back |
| PAP, 2024: fake "mobilisation" dispatch, published twice ([Notes from Poland](https://notesfrompoland.com/2024/05/31/fake-polish-press-agency-reports-on-sending-troops-to-ukraine-blamed-on-russian-hackers/)) | Publishing access | Read-only mode; incident playbook |
| LIGA.net and others, 2024: fake story auto-shared to X ([IMI](https://imi.org.ua/en/news/someone-hacks-the-liga-net-website-posts-russian-disinformation-on-avdiivka-i59293)) | Auto-posting amplified a breach | Telegram approval plus cancellable delay |
| Lee Enterprises ransomware, 2025: ~350 GB taken, $10.5M losses ([SEC 10-Q](https://www.sec.gov/Archives/edgar/data/0000058361/000005836126000060/lee-20260628.htm)) | Ransomware | Off-site immutable backups; restore drills |
| Kloop (Kyrgyzstan): 50 TB DDoS over 7 hours ([Qurium](https://www.qurium.org/press-releases/kloop-media-hit-by-50-tb-multi-vector-ddos-attack/)) | Volumetric attack | Cloudflare; public pages fully cached; hidden origin |
| Uzbek Telegram and YouTube hijacks, 2025–26 ([Uzbek Forum](https://www.uzbekforum.org/digital-attacks-silence-independent-uzbek-journalists-and-government-critics/)) | Admin devices, platform abuse reports | Dedicated owner phone; few admins; own channels (site, newsletter) |
| Uzbek governor's Telegram account, Dec 2025: malicious file and a fake "Central Bank" bot ([Kun.uz](https://kun.uz/en/news/2026/07/13/how-cybercriminals-used-hacked-accounts-and-fake-documents-to-steal-millions-in-uzbekistan-201719)) | Opening files on an admin phone | No files or APKs on admin devices |
| Journalists in Uzbekistan, 2020: phishing that relays one-time codes, and trojanised Telegram Desktop ([Amnesty](https://amnesty.org/en/latest/research/2020/03/targeted-surveillance-attacks-in-uzbekistan-an-old-threat-with-new-techniques)) | SMS and authenticator codes can be relayed | Hardware security keys ([CPJ](https://cpj.org/2019/01/cpj-safety-advisory-sophisticated-phishing-attacks/), [FPF](https://freedom.press/newsletter/2024-resolution-get-started-with-security-keys/)) |
| ccTLD registry hijacks (.gh, .sl, .as), Oct 2026 ([Google](https://blog.google/security/chromes-response-to-recent-cctld-registry-hijacks/)) | The registry itself was compromised | Certificate Transparency monitoring (we cannot control .uz) |

### 3.2 Threats and controls, prioritised

**P0** = before the CMS goes live. **P1** = within the first month. **P2** = later.

| # | Threat | Controls | Priority |
|---|---|---|---|
| T1 | Staff account phished, fake story published | Admin on `cms.muomalat.uz` behind Cloudflare Access with security keys only. Access login checked again inside Payload. Two-person publish. Audit alerts sent off the server. Read-only switch. Payload versions for rollback | P0 |
| T2 | Fake story amplified on Telegram | Telegram posts approved by a non-author editor; 3-minute cancellable delay; bot rights limited to post, edit and delete; alert on any channel-admin change | P0 (posting is manual until the bot ships) |
| T3 | Telegram channel hijacked | Owner account on a newsroom SIM and a dedicated phone; 2-step password, passkey, recovery email; at most one other full admin; staff admins can only post and edit; monthly session review; screenshot "Recent actions" immediately in an incident (kept about 48 h, *unverified*) ([Telegram passkeys](https://telegram.org/blog/passkeys-and-gift-offers), [admin rights](https://core.telegram.org/bots/api#chatadministratorrights)) | P0 |
| T4 | Payload or Next.js vulnerability | Pin `payload` 3.90.2+; public site reads content only through Payload's server-side Local API (`/api` blocked at the edge on muomalat.uz); GraphQL off; first admin created by script before the app is reachable (first-register RCE, GHSA-97rh-rhh2-7vjv); override `access.unlock` (CVE-2026-11779 lists no fix up to 3.88.0, and the 3.90.2 code is reportedly unchanged); critical patches within 48 h; Renovate with a cooldown | P0 |
| T5 | DDoS | Cloudflare in front; public pages cacheable at the edge; origin reached only through Cloudflare Tunnel, with no public IP or ports ([Cloudflare](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/)); apply to Project Galileo through a partner ([Galileo](https://www.cloudflare.com/galileo/); eligibility of a commercial outlet unclear) | P0 (Tunnel), P1 (Galileo) |
| T6 | Domain or DNS hijack | Renew muomalat.uz for several years now (expires 2027-10-08, verified by WHOIS); security keys on the registrar (SUVAN NET) and Cloudflare accounts; DNSSEC with the DS record submitted; CAA records; Cloudflare CT monitoring ([CT monitoring](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/certificate-transparency-monitoring/)); at most two Cloudflare super-admins | P0 |
| T7 | Server compromise or ransomware | Ubuntu LTS with security updates; SSH keys only, not public; containers non-root with read-only filesystems; Docker ports bound to 127.0.0.1 because Docker bypasses UFW ([Docker docs](https://docs.docker.com/engine/network/packet-filtering-firewalls/)); app database role is not a superuser; nightly encrypted backups to an EU bucket with object lock; monthly restore test ([CISA](https://www.cisa.gov/stopransomware/ransomware-guide)) | P0 |
| T8 | Malicious npm package | Committed lockfile and `npm ci`; `min-release-age` in `.npmrc`; Renovate `minimumReleaseAge`; build in CI, never on the VPS ([Shai-Hulud](https://www.theregister.com/2025/11/24/shai_hulud_npm_worm/), [Renovate](https://docs.renovatebot.com/key-concepts/minimum-release-age/)) | P0 |
| T9 | Our own mistake: test content, early embargo | Separate staging database and staging Telegram bot; test accounts have no publish rights in production; embargo hard lock | P0 |
| T10 | Hostile third-party script | No raw HTML or script blocks in the CMS; embeds from an allowlist only; static CSP with `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'` | P0 |
| T11 | Email spoofing in Muomalat's name | SPF `-all`, DKIM, DMARC moving to `p=reject` | P1 |
| T12 | Platform takedown through abuse reports | Own channels (site, email digest); backup Telegram channel reserved | P1 |
| T13 | Legal demand or breach exposes a source | Confidential sources' names are never stored in the CMS, only code names (Art. 33 of the media law); internal source notes readable only by the authors and the editor-in-chief | P0 |
| T14 | Reader data misused or leaked | Personal-data collections readable only by the roles that need them; no newsroom access to subscriber lists; consent records; 24/72-hour breach procedure (section 4.3) | P0 |

**Why "never public" is the core control.**

- Payload's 2026 advisories include three critical SQL-injection flaws in the Postgres adapter, a pre-authentication remote-code-execution flaw through first-user registration, and several access-control bypasses ([advisories](https://github.com/payloadcms/payload/security/advisories); 22 published on 18 Sept and 10 more on 6–8 Oct 2026, all fixed by 3.90.0).
- Several were exploitable only by someone who can send queries to the API.
- If the API cannot be reached from the internet, and the admin sits behind a second, independent log-in, most of these never reach us. Patching still matters.

**Two-factor login.**

- Payload has no built-in two-factor login ([Payload auth](https://payloadcms.com/docs/authentication/overview)). The community plugins are small and maintained by single developers.
- Cloudflare Access can require security keys or biometrics only, with no codes ([Independent MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/)). Whether that option is on the free plan is *unverified*.
- The free Zero Trust plan covers up to 50 users ([Cloudflare 2020](https://blog.cloudflare.com/teams-plans), confirmed by third-party guides in 2026).
- NIST rates SMS as "restricted" and prohibits email as an out-of-band second factor ([NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)). So no SMS and no email codes.
- Buy two FIDO2 keys per person.

### 3.3 Not worth it now

- A self-hosted SIEM, Vault, an HSM, or ISO/SOC 2. Use off-server alerts and an encrypted environment file instead.
- A nonce-based CSP on public pages. Nonces force dynamic rendering, which removes caching (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
- fail2ban on HTTP. Behind Cloudflare it only sees Cloudflare's addresses.
- A bug bounty. Publish `/.well-known/security.txt` instead.
- Payload Enterprise for SSO and audit. Cloudflare Access plus our own audit log covers the need.

---

## 4. Uzbekistan legal context

Uzbek-language texts on lex.uz are authoritative. The Russian versions are translations. Our researchers are not lawyers; every item marked "ask counsel" needs an Uzbek media and data lawyer.

### 4.1 Registration and the mass-media law

Law "On Mass Media", ZRU-78 of 2007, latest amendment ZRU-963 of 20.09.2024 ([lex.uz](https://lex.uz/docs/-1106870)):

- **Registration first.** A website that publishes at least once every six months counts as mass media once registered (Art. 4). The newsroom "may begin its activity after state registration" (Art. 15). Do not present Muomalat publicly as a mass-media outlet before the certificate is issued.
- **Home-page imprint (Art. 27¹):**
  - the outlet's name;
  - the registration date and certificate number;
  - the founder;
  - the editor-in-chief's full name, including patronymic;
  - an "index" (meaning unclear for a website; ask counsel);
  - the postal and email address.

  `src/content/data/site.ts` already has all of these except "index". In the CMS they become a site-settings block with a change log.
- **Re-registration (Art. 20).** Changing the name, language, type, founder, goals or specialisation requires re-registration. Other changes must be reported within one month. **Register all four editions (Uzbek Latin, Uzbek Cyrillic, Russian, English) in the first application** *(inference)*.
- **Editor-in-chief (Art. 16, 26).** The editor-in-chief leads the newsroom, is legally responsible, and permits each release. How "each release" applies to a continuously updated site is unclear (ask counsel). Our CMS records who approved every publication. When the editor-in-chief delegates to duty editors, a written order should record it *(inference)*.
- **Sources (Art. 33).** A confidential source may not be named without written consent.
- **Refutation and reply (Art. 34).** On the same page, under a special heading, within one month (section 2.4).
- **Official information (Art. 40).** No liability for inaccuracies taken from official communications, official statistics, news agencies or press services.
- **Procedure.** Cabinet resolution 86 of 22.02.2022, Annex 10, as amended in 2024 ([lex.uz](https://lex.uz/docs/-5871129)):
  - electronic application with charter or founders' agreement;
  - review in 8 working days;
  - unlimited validity;
  - fee of 50% of the base calculation amount (BRV) for an internet outlet (2026 amount in soʻm not confirmed).
  - Permit conditions include not publishing investigation materials without the investigator's permission and not predicting court outcomes. These belong in the editorial policy.
- **Regulator.** The Agency of Information and Mass Communications was dissolved in July 2025 ([Kun.uz](https://kun.uz/en/news/2025/07/16/uzkomnazorat-takes-over-media-oversight-duties-from-dissolved-aimc)). Presidential resolution PQ-371 of 11.12.2025 gave media registration to the Inspection under the Ministry of Digital Technologies ([Anhor](https://anhor.uz/news/uzkomnazorat/), [Spot](https://www.spot.uz/oz/2025/12/12/control-media/)). The text of Annex 10 has not caught up. Confirm the current portal with the Inspection.

### 4.2 Advertising law

Law ZRU-776, in force since September 2022, amended up to March 2025 ([Uzbek text](https://lex.uz/uz/docs/-6052631), [Russian](https://lex.uz/ru/docs/6052633)):

- **Art. 18, labelling.** Advertising must be separated so it can be identified, "regardless of form or means of distribution". Paid editorial material that promotes a brand "is considered advertising and must be placed under the heading «Реклама»".
  - In September 2026 the Competition Committee said the label must be «реклама» or «на правах рекламы» ("as advertising"). It said commercially motivated analysis and opinion count too, and that more than 20 channel admins and bloggers had faced measures ([Spot](https://www.spot.uz/ru/2026/09/03/ad-regulations/), [UzA](https://uza.uz/ar/posts/reklama-v-socsetyax-dolzhna-byt-zametnoy-komitet-po-konkurencii-predupredil-blogerov_903570)).
  - **Recommendation:** change the partner-content label to "Reklama · Hamkorlik materiali" / "Реклама · Партнёрский материал" / "Advertisement · Partner content". Use it on the site, in RSS and on Telegram. Keep the distinct brass design. Ask counsel whether the Russian and English editions also need the Uzbek word.
- **Art. 6, language.** Advertising is published in the state language; translations may be added. The exemption covers only sites that publish *exclusively* in foreign languages, so ads on `/ru` and `/en` probably still need an Uzbek version *(inference; ask counsel)*. Every sponsored item has an Uzbek original by design.
- **Art. 13.** The publisher must ask the advertiser for the relevant licence.
- **Art. 42 (securities, banks, insurance, services that take people's money):**
  - the advertiser must hold the licence;
  - no statements about expected returns (bank deposits are exempt);
  - a mandatory warning that the investment may be lost.

  **Art. 43:** financial-service ads must disclose the key contract terms.
- **Art. 15.** Ad contracts and materials, including later changes, are kept for 3 years after the last publication.
- **Art. 47, 49.** Improper advertising is fined 70 BRV, and the distributor (the publisher) is liable for placement.
- **Art. 16.** No prices in foreign currency, and no use of a person's name or image without consent.

### 4.3 Personal data: what changed in 2026, the recommendation, and what it means for hosting

**Two of our researchers relied on the 2021 rule, which required all citizens' data to stay in Uzbekistan ([Gratanet](https://gratanet.com/news/personal-data-of-uzbek-citizens), [Mondaq](https://mondaq.com/data-protection/1070336/personal-data-of-uzbek-citizens-now-must-be-stored-in-uzbekistan)). That rule has been replaced.** The current position comes from the law text and the March and August 2026 reports:

- **Law ZRU-1125 of 26.03.2026 rewrote Art. 27¹ of the Personal Data Law** ([lex.uz](https://lex.uz/docs/4396419), [Kun.uz](https://kun.uz/ru/news/2026/03/28/xraneniye-nekotoryx-personalnyx-dannyx-za-predelami-uzbekistana-razresheno)). It has been in force since 27.03.2026.
  - Only **biometric, genetic and telecom-subscriber data** must be stored in Uzbekistan.
  - Other personal data may be stored abroad if one of three conditions holds: the country is on the Cabinet's list; the operator adopts approved standard contract terms or binding corporate rules; or the operator complies with listed international standards.
- **Cabinet resolution 415 of 29.07.2026 (in force 03.08.2026) lists 49 countries** ([lex.uz](https://lex.uz/uz/docs/8369688), [Spot](https://www.spot.uz/ru/2026/08/04/personal-data-abroad/)).
  - The list includes Lithuania, Germany, France, the Netherlands, the UK and most of the EU.
  - The US counts only for companies in the EU–US Data Privacy Framework.
  - **India, Malaysia and Indonesia are not on the list.**
  - A data leak during a cross-border transfer must be reported within 24 hours, with a detailed report within 72 hours.
- **The database register.** Registration in the state register now applies only to databases that must be stored in Uzbekistan (Art. 20, as amended). Art. 31 still lists "register its databases" among general duties, so ask counsel.
- **Duties that still apply:**
  - consent that can be proved (Art. 21, 31);
  - written notice of purpose and rights (Art. 23);
  - notice **within 3 days** if data is passed to a third party (Art. 23);
  - no processing beyond the consent (Art. 19), and new consent if the purpose changes;
  - a named responsible person (Art. 31);
  - an electronic way to ask for suspension or deletion (Art. 31).

  Liability: Administrative Code Art. 46-2, Criminal Code Art. 141-2.
- **Which state body is responsible is unclear.** The law names the State Personalization Centre; resolution 415 names the Ministry of Internal Affairs' Migration and Personalisation Department ([UzA](https://uza.uz/posts/808545)).

**Recommendation.**

- **Host the VPS in Hostinger's Lithuania region, or Germany if Lithuania is unavailable**, and keep backups in an EU region too. Hostinger's VPS locations include Lithuania, Germany, France, the UK, the US, India, Malaysia, Brazil and Indonesia ([Hostinger](https://www.hostinger.com/vps-hosting)).
- **Do not use the India, Malaysia, Indonesia or US regions.**
- **Collect no biometric data.** No face-ID check-in at club events, for example.
- **Collect as little personal data as possible.**
- **Before go-live, ask counsel to confirm:**
  - that an EU VPS run by a non-Uzbek host satisfies Art. 27¹ under the country-list route;
  - that paragraph 4 of resolution 415, on transfers "through information systems created under international agreements", does not add a condition;
  - that no database registration is needed;
  - which body receives breach reports.

**What this means for hosting.**

1. No Uzbek data centre is needed for staff accounts, newsletter subscribers, club applications or contact forms. The single VPS can hold everything.
2. Registering databases in the state register is probably unnecessary, pending counsel.
3. We still need:
   - consent records (the text version, time, language and purpose);
   - notice texts in all four languages;
   - a deletion request route;
   - a named responsible person;
   - retention periods;
   - a 24/72-hour breach runbook.
4. **Latency.** Uncached requests from Tashkent take about 110–120 ms to an EU server. Our researcher measured Cloudflare serving Uzbek traffic from Warsaw at about 115 ms. Pages are cached at Cloudflare, so readers barely notice; editors in the admin will feel it slightly.
5. **A fallback if the law or counsel's reading changes.** The spec keeps the four personal-data collections separate from editorial content and behind one storage interface. They can then be moved to an Uzbek host without touching the newsroom side: [Ahost](https://ahost.uz/), [UZINFOCOM dc.uz](https://dc.uz/) or [Sarkor](https://sarkor.uz/), whose prices we have not researched.
6. **Cloudflare sees form traffic in transit.** Cloudflare is a US company. Whether it participates in the Data Privacy Framework, which resolution 415 requires for US recipients, is *unverified*. Check before launch.

### 4.4 Other duties

- **Law on Informatisation, Art. 12¹** ([lex.uz](https://lex.uz/docs/82956)). Website owners must:
  - verify information before posting it, and remove inaccurate information immediately;
  - monitor their own resources, explicitly "including in instant-messaging systems" (our Telegram channel and any comments under it);
  - remove prohibited content.

  ZRU-1115 (January 2026) added a ban on unlawful processing of personal data with AI. Consequence: disable channel comments, or moderate a linked discussion group.
- **Age marks.** Child-protection law ZRU-444, Art. 17: 0+, 7+, 12+, 16+ or 18+, set before distribution, and distribution without a mark is banned ([lex.uz](https://lex.uz/docs/3333797), [Kun.uz 2018](https://kun.uz/news/2018/10/24/esga-oid-toifa-belgisi-bulmagan-ahborotni-tarkatis-takiklandi)). Gazeta and Spot show 18+; our placeholder is 16+. The CMS gets a site-wide mark and a per-article override. Ask counsel which site mark to use.
- **Cybersecurity law ZRU-764** ([lex.uz](https://lex.uz/en/docs/6997403), [Mondaq](https://www.mondaq.com/security/1194912/uzbekistan-adopts-cybersecurity-law)). The State Security Service is the authority, and an owner that investigates an incident must report the results. Whether this binds a private media company is unconfirmed.

### 4.5 Questions for counsel (one meeting)

1. Is an EU-hosted VPS (Hostinger, Lithuania) compliant for staff, subscriber, club and contact data? Is database registration needed? Who receives breach reports?
2. Does "Reklama · Hamkorlik materiali" satisfy ZRU-776 Art. 18? Do the `/ru` and `/en` pages also need the Uzbek word? Do ads on `/ru` and `/en` need an Uzbek version (Art. 6)?
3. Should we register all four editions in one application? What does "index" mean for a website?
4. How does Art. 26 (the editor-in-chief permits each release) apply to continuous publishing, and is a written delegation to duty editors enough?
5. Which age mark: 16+ or 18+?
6. Does the one-month Art. 34 deadline apply to us as "electronic form"? What counts as "the same page"?
7. Is ZRU-764 incident reporting mandatory for us?
8. What retention periods should we use for contact, club and subscriber data? Spec §13 proposes some.

---

## 5. The decision: Payload CMS 3 and PostgreSQL

### 5.1 Why Payload

- **It runs inside the app we already have.** `@payloadcms/next@3.90.2` requires Next ≥16.3.3 <17 and React ^19.0.1, and our Next 16.4.0 and React 19.3.0 qualify ([npm](https://registry.npmjs.org/payload)). There is one codebase, one deployment and one TypeScript model. The admin lives at `/admin`.
- **It has the newsroom basics built in:**
  - drafts with a Draft / Published / Changed indicator, and version history with compare and restore ([versions](https://payloadcms.com/docs/versions/overview), [drafts](https://payloadcms.com/docs/versions/drafts));
  - autosave;
  - document locking with take-over ([locking](https://payloadcms.com/docs/admin/locked-documents));
  - soft delete ([trash](https://payloadcms.com/docs/trash/overview));
  - live preview ([live preview](https://payloadcms.com/docs/live-preview/overview));
  - per-field languages ([localization](https://payloadcms.com/docs/configuration/localization));
  - collection- and field-level access rules ([access control](https://payloadcms.com/docs/access-control/overview));
  - saved list filters ([query presets](https://payloadcms.com/docs/query-presets/overview));
  - a rich-text editor that stores JSON and supports custom blocks ([Lexical](https://payloadcms.com/docs/rich-text/official-features)).
- **The data is ours**, in PostgreSQL on our server. That supports the legal position (section 4.3) and backups.
- **The licence is MIT.** Figma acquired Payload in June 2025 and said it "will remain an open-source product" ([Figma](https://www.figma.com/blog/payload-joins-figma/)).
- **PostgreSQL** is mature, has indexed JSON, and is the database the Guardian chose for Composer ([InfoQ](https://www.infoq.com/news/2019/01/guardian-mongodb-postgresql/)).

### 5.2 What Payload does not give us, and we build

| Gap | Our answer | Source for the gap |
|---|---|---|
| Approval workflow | `workflowStatus` field, transition table, hooks that enforce the two-person rule | [Payload Enterprise](https://payloadcms.com/enterprise); [independent review, 2026](https://www.buildwithmatija.com/blog/payload-cms-publishing-team-honest-review-2026) |
| Audit log | Append-only `audit-log` collection; the database role cannot update or delete it; events forwarded off the server | Same; 3.x version records do not store the user ([source](https://github.com/payloadcms/payload/blob/3.x/packages/payload/src/versions/buildCollectionFields.ts)) |
| Two-factor login and SSO | Cloudflare Access in front, with the Access login checked inside Payload | [Payload auth](https://payloadcms.com/docs/authentication/overview) |
| IP rate limiting | Cloudflare rules | [Preventing abuse](https://payloadcms.com/docs/production/preventing-abuse) |
| Safe defaults | Override: `cookies.secure` (off by default), `access.unlock` (any admin user can unlock anyone by default), CSRF list, GraphQL off, upload types | [defaults.ts](https://github.com/payloadcms/payload/blob/3.x/packages/payload/src/collections/config/defaults.ts); CVE-2026-11779 |
| Uzbek admin interface | Uzbek field labels now; an Uzbek pack later | [translations](https://github.com/payloadcms/payload/tree/3.x/packages/translations/src/languages) |

### 5.3 Alternatives considered

| Option | What is good | Why not, for Muomalat |
|---|---|---|
| **Directus** (self-hosted) | Built-in two-factor login (enforceable), activity log with IP addresses, SSO, all without an enterprise tier; free under $5M in total finances ([BSL FAQ](https://directus.io/bsl-faq), [2FA](https://directus.com/docs/guides/auth/2fa), [activity log](https://directus.io/features/activity-log)) | A second app beside Next.js to run and secure; BSL licence, not open source; weaker rich-text authoring; our TypeScript content model would be duplicated. **Plan B** if Payload's patch tempo becomes unmanageable |
| **WordPress** (self-hosted, headless) | Mature newsroom plugins: Edit Flow statuses and calendar ([Edit Flow](https://cdn.jsdelivr.net/wp/plugins/edit-flow/tags/0.6.4/readme.txt)), Co-Authors Plus, "Submit for Review" built in ([WordPress](https://wordpress.org/documentation/article/post-status/)); Vox moved to it | A second runtime (PHP); multilingual and two-factor login depend on third-party plugins, each adding attack surface; the block editor stores HTML with comments rather than our typed blocks; headless mode exposes a public API we would have to lock down *(our assessment)* |
| **WordPress VIP** | Managed, 99.95%+ uptime, used by TIME and Vox ([pricing](https://wpvip.com/pricing/)) | Enterprise contract, no public price; built for much larger newsrooms |
| **Arc XP** | Purpose-built for newsrooms | No public price (estimates $5k+ a month, *unverified*); loss-making unit with layoffs ([Axios](https://www.axios.com/2024/09/23/wapo-lays-off-54-people-at-publishing-tech-arm-arc-xp)) |
| **Strapi** (self-hosted) | Free Community edition with roles and unlimited languages | Review workflows and audit logs are Enterprise only ([pricing](https://strapi.io/pricing-self-hosted)) |
| **Sanity** | Best editorial experience of the hosted options; used by Politico and Semafor | Content lives in Sanity's hosted Content Lake; custom roles, SAML and audit trail are Enterprise only ([pricing](https://sanity.io/pricing)) |
| **Contentful, Storyblok** | Mature hosted services | Workflows, custom roles and SSO sit in custom-priced tiers; Storyblok's enforced 2FA needs Premium ([Storyblok pricing](https://www.storyblok.com/pricing)); pricing for Contentful could not be read (HTTP 429) |
| **Ghost** | Simple, with good newsletters | No native multilingual support ([forum](https://forum.ghost.org/t/native-multilingual-support/49539)); new-device login codes are sent by email ([Ghost 2FA](https://ghost.org/changelog/2fa/)) |
| **Build our own** | Total fit | The Vox Chorus lesson: maintenance cost keeps rising ([XWP](https://xwp.co/case-studies/vox-media/)) |

### 5.4 Conditions attached to this decision

- Payload is pinned to an exact version of 3.90.2 or later. Upgrades follow the weekly patch routine. Each upgrade runs `payload migrate` (3.90.0 itself needed a migration).
- Plugins that carried 2026 advisories are not installed: form-builder, import-export, MCP and multi-tenant ([advisories](https://github.com/payloadcms/payload/security/advisories)).
- Code never relies on Payload's default access override. The Local API's `overrideAccess` default flips from `true` to `false` in Payload 4 ([v4 migration guide](https://github.com/payloadcms/payload/blob/main/docs/migration-guide/v4.mdx)). We pass it explicitly everywhere, use Node 24 now (Payload 4 will require 24.15+), and avoid field names Payload 4 reserves (`createdBy`, `updatedBy`).
- A short technical spike verifies the uncertain Payload behaviours before the full build (CMS-SPEC §18).

---

## 6. Risks and open questions

### 6.1 Risk register

| Risk | Likelihood / impact | Mitigation | Owner |
|---|---|---|---|
| Critical Payload or Next.js flaw before we patch | High / high | API and admin not public; weekly patch window; 48-hour rule for critical fixes; GitHub release watch (fixes ship before advisories: about half the advisories came out later than the fix, by a median of about 11 days, per our researcher's count) | Developer |
| The workflow we build has a bypass (for example the Publish button or scheduled jobs) | Medium / high | All rules enforced in server hooks, not the UI; acceptance tests in CMS-SPEC §16 cover every publish path | Developer |
| The two-person rule slows breaking news at night | Medium / medium | Fast path for official-source news with a 30-minute second read; duty rota | Editor-in-chief |
| Telegram channel hijack | Medium / high | Section 3.2 T3; backup channel; emergency banner on the site | Editor-in-chief |
| Sponsored label judged non-compliant | Medium / medium (fine 70 BRV, reputation) | Adopt "Reklama · …" now; counsel review | Commercial lead |
| Data-law reading wrong, or the law changes again | Low–medium / medium | Personal-data collections isolated and movable; minimal data | Founder |
| Payload 4 migration cost | Certain / medium | Node 24 now; explicit `overrideAccess`; avoid reserved names; plan the migration only after 4.0 is stable | Developer |
| Cloudflare free-plan limits (Access MFA options, rate-limit rules, purge rate of 5 requests a minute) | Medium / low | Verify in Phase 0; Pro plan if needed | Developer |
| One developer as a single point of failure | High / high | This spec, runbooks, two people with server and Cloudflare access, documented restore | Founder |
| Machine translation errors published | Low / high | Reviewer must differ from translator; outdated translations hidden | Editor-in-chief |

### 6.2 Open questions and uncertain claims

- **Legal:** the eight counsel questions in 4.5.
- **Payload behaviour to verify in the spike (CMS-SPEC §18):**
  - that the documented "`update` returns `_status: draft`" pattern hides Publish without side effects;
  - that values set in a collection `beforeChange` hook persist on fields the user cannot write;
  - whether the admin refreshes the token while the user is active, which is what makes `tokenExpiration` act as an idle timeout;
  - `formatOptions` re-encoding of originals;
  - that the admin works with Next's Cache Components;
  - the jobs CLI flags;
  - the date-field `timezone` option.
- **Cloudflare:**
  - whether Independent MFA (security keys only) is on the free Zero Trust plan;
  - how many rate-limiting rules the free plan has;
  - Cloudflare's participation in the Data Privacy Framework.
  - Purge by URL, prefix and tag is now open to all plans: free accounts get 5 requests a minute (bursts up to 25) and 100 operations per request ([changelog](https://developers.cloudflare.com/changelog/post/2025-04-01-purge-for-all/index.md), [purge docs](https://developers.cloudflare.com/cache/how-to/purge-cache)).
- **Telegram:**
  - whether bot-sent channel posts can be edited with no time limit, inferred because the docs state none;
  - the 48-hour admin-log window and the 7-day rule for transferring ownership (third-party sources);
  - which IP addresses and user agent the link-preview crawler uses.
- **Sources that may be out of date:**
  - the Reuters Handbook (2009);
  - the WaPo corrections memo (2013);
  - NYT Oak details (2018–2020, partly second-hand);
  - Arc ideas-portal claims (2020–2024);
  - Ophan, Lantern and Stela (2014–2019);
  - BBC Vivo (about 2019).
- **Editorial decisions for the founder and editor-in-chief:**
  - should the Telegram channel also post Cyrillic versions, as Kun.uz posts in Cyrillic;
  - comments under channel posts: off, or a moderated group;
  - which recurring events go on the planning calendar (Central Bank meetings, statistics releases, club meetings).

### 6.3 Where researchers disagreed, and how we resolved it

| Topic | Disagreement | Resolution |
|---|---|---|
| Data localisation | The workflow and security researchers cited the 2021 rule (all data stays in Uzbekistan); the platforms and Uzbekistan researchers found ZRU-1125 (2026) | The 2026 text on lex.uz is current; EU hosting is allowed, with counsel to confirm |
| Payload advisory dates | One researcher reported 19 advisories on 6–7 October; another reported 22 on 18 September | Checked on GitHub on 9 October: 22 published on 18 Sept (the 3.90.0 release day), 5 on 22 Sept, then 3 on 6 Oct and 7 on 8 Oct; 49 in 2026 in total (8 critical, 23 high, 18 medium); all patched by 3.90.0 |
| Job runner | `autoRun` inside the app or a separate worker | A separate worker. A worker process cannot call Next's `revalidateTag` (the docs allow it only in server functions and route handlers), so all cache refresh goes through one internal route that both the admin and the worker call |
| Scheduling | Payload's built-in `schedulePublish` or our own | Our own scheduler, because it must re-check approval and embargo at publish time, and built-in scheduled publishing had two 2026 advisories |
| Statuses | 7 to 10 proposed | 8 states plus three-state flags, following Arc's "start small" advice |
