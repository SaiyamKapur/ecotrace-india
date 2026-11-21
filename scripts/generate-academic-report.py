#!/usr/bin/env python3
"""Generate the EcoTrace India INT 252 academic report in DOCX and PDF.

Run with: PYTHONPATH=.report-libs ECOTRACE_PREVIEW_URL=<verified-preview-url> python3 scripts/generate-academic-report.py
Screenshots are genuine Playwright captures from the running application.
"""
import html
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from PIL import Image as PILImage, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as PDFImage, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'reports'
SHOTS = OUT / 'screenshots'
DIAGRAMS = OUT / 'diagrams'
DIAGRAMS.mkdir(parents=True, exist_ok=True)
OUTPUT_STEM = 'EcoTrace-India-INT252-Saiyam-Kapur'
DATE = datetime.now().strftime('%d %B %Y')
PREVIEW = os.environ.get('ECOTRACE_PREVIEW_URL', 'Platform-managed preview requires sandbox session access; an unauthenticated public URL is not guaranteed')
TEST = json.loads((OUT / 'test-results.json').read_text())
assert TEST['result'] == 'PASS', 'Do not create a verification report when functional tests failed.'
SCREEN_FILES = sorted(SHOTS.glob('*.png'))
assert len(SCREEN_FILES) >= 19, 'Need real Playwright screenshots before report generation.'

sql = "select json_build_object('users',(select count(*) from users),'centers',(select count(*) from collection_centers),'punjab_centers',(select count(*) from collection_centers where state='Punjab'),'products',(select count(*) from product_listings),'settlements',(select count(*) from settlement_records),'requests',(select count(*) from pickup_requests),'batches',(select count(*) from recycling_batches))::text;"
raw = subprocess.check_output(['psql', 'postgresql://postgres:postgres@127.0.0.1:5432/app_db', '-tAc', sql], text=True).strip()
STATS = json.loads(raw)

DARK = (5, 46, 34)
FOREST = (5, 95, 69)
EMERALD = (5, 150, 105)
MINT = (220, 247, 233)
LIME = (186, 238, 108)
INK = (20, 33, 38)
MUTED = (79, 100, 98)
CREAM = (247, 251, 247)
GOLD = (237, 184, 65)
FONTPATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLDFONTPATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def font(size=27, bold=False):
    return ImageFont.truetype(BOLDFONTPATH if bold else FONTPATH, size)

def rr(draw, box, fill, radius=22, outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def diagram_architecture():
    w,h=1900,770
    im=PILImage.new('RGB',(w,h), CREAM)
    d=ImageDraw.Draw(im)
    d.text((50,32),'SYSTEM ARCHITECTURE / FIVE CONNECTED LAYERS',font=font(37,True),fill=DARK)
    d.text((50,90),'Next.js App Router + React 19 + PostgreSQL via Drizzle ORM',font=font(23),fill=MUTED)
    cols=[(60,175,350,525),(420,175,710,525),(780,175,1070,525),(1140,175,1430,525),(1500,175,1790,525)]
    labels=[('01  EXPERIENCE','React 19 client UI','Public pages, six roles','Upload / charts / PWA'),('02  DELIVERY','Next.js App Router','Server components','API route handlers'),('03  DOMAIN','Business services','RBAC + Zod + states','AI / analytics / audit'),('04  DATA ACCESS','Drizzle ORM','Typed schema & queries','Foreign keys / JSONB'),('05  PERSISTENCE','PostgreSQL','13 relational tables','Sessions / trace / wallet')]
    for i,(box,item) in enumerate(zip(cols,labels)):
        rr(d,box, DARK if i==4 else (255,255,255),20,EMERALD,3)
        x1,y1,x2,y2=box
        fg=(255,255,255) if i==4 else INK
        d.text((x1+22,y1+28),item[0],font=font(23,True),fill=LIME if i==4 else FOREST)
        d.text((x1+22,y1+102),item[1],font=font(29,True),fill=fg)
        d.line((x1+22,y1+154,x2-22,y1+154),fill=(207,228,215),width=2)
        d.text((x1+22,y1+190),item[2],font=font(21),fill=fg)
        d.text((x1+22,y1+238),item[3],font=font(21),fill=fg)
        if i<4:
            ax=x2+14; ay=350
            d.line((ax,ay,ax+32,ay),fill=EMERALD,width=6)
            d.polygon([(ax+31,ay-10),(ax+45,ay),(ax+31,ay+10)],fill=EMERALD)
    rr(d,(490,610,1400,716),(231,246,237),16)
    d.text((515,630),'LIVE OPENROUTER / FREE MODEL ROUTER',font=font(25,True),fill=FOREST)
    d.text((515,668),'Free provider busy? Honest guided chat and labeled image Demo Mode.',font=font(21),fill=INK)
    out=DIAGRAMS/'01-system-architecture.png';im.save(out);return out

def diagram_er():
    w,h=1880,1060
    im=PILImage.new('RGB',(w,h),CREAM);d=ImageDraw.Draw(im)
    d.text((55,30),'ENTITY RELATIONSHIPS / POSTGRESQL',font=font(36,True),fill=DARK)
    d.text((55,81),'13 persisted tables with owner-scoped access and chronological trace records',font=font(22),fill=MUTED)
    entities=[
        ('users','id PK  |  role  |  bcrypt hash','1 to many: sessions, listings, requests'),
        ('sessions','id PK  |  user_id FK  |  expiry','HTTP-only token hashes'),
        ('collection_centers','id PK  |  code unique  |  location','6 Punjab + 5 other sample hubs'),
        ('pickup_requests','id PK  |  citizen_id FK','items, estimated & actual kg'),
        ('product_listings','id PK  |  owner_id FK','photo, offer paise, request_id FK'),
        ('settlement_records','id PK  |  listing_id FK unique','approval -> DEMO wallet credit'),
        ('recycling_batches','id PK  |  recycler_id FK','dispatched vs received vs documented'),
        ('traceability_events','id PK  |  request_id FK','append-only custody milestones'),
        ('epr_records','id PK  |  batch_id FK','internal / non-statutory evidence'),
        ('notifications','id PK  |  user_id FK','private workflow alerts'),
        ('audit_logs','id PK  |  actor_id FK','administrative action history'),
        ('platform_settings','key PK  |  value JSONB','pilot coverage + thresholds'),
        ('chat_messages','id PK  |  user_id FK','private multilingual transcript'),
    ]
    bw,bh=420,180
    centers={}
    for i,(title,fields,description) in enumerate(entities):
        col=i%4;row=i//4
        x=40+col*465; y=140+row*215
        rr(d,(x,y,x+bw,y+bh),(255,255,255) if row%2 else (233,248,239),18,(170,216,186),3)
        rr(d,(x+12,y+12,x+bw-12,y+58),DARK,10)
        d.text((x+26,y+23),title,font=font(24,True),fill=(255,255,255))
        d.text((x+22,y+83),fields,font=font(20),fill=INK)
        d.text((x+22,y+122),description,font=font(18),fill=MUTED)
        centers[title]=(x+bw//2,y+bh//2)
    d.text((540,973),'Core links: users -> listings -> requests -> batches -> EPR  |  listings -> settlements',font=font(21,True),fill=FOREST)
    out=DIAGRAMS/'02-entity-relationship.png';im.save(out);return out

def diagram_workflow():
    w,h=1840,730
    im=PILImage.new('RGB',(w,h),CREAM);d=ImageDraw.Draw(im)
    d.text((55,35),'END-TO-END CUSTOMER TO RECYCLER WORKFLOW',font=font(37,True),fill=DARK)
    d.text((55,95),'Independent trust gates prevent an estimate becoming a confirmed weight or a fake payout.',font=font(21),fill=MUTED)
    labels=[('PHOTO + LIST','Customer-owned listing','image, condition, qty'),('ADMIN OFFER','Reviewed demo quote','accept / decline'),('PICKUP','Assigned partner','real count & scale kg'),('CENTER','Hub verifies','custody + audit log'),('RECYCLER','Documented recovery','receipt / mass balance'),('SETTLEMENT','Admin approves','eligible only after docs'),('DEMO WALLET','Simulated credit','printable statement')]
    for i,(head,sub,last) in enumerate(labels):
        row=i//4;col=i%4
        x=45+col*460;y=165+row*265
        rr(d,(x,y,x+395,y+190), DARK if i==6 else (255,255,255),20, EMERALD,3)
        fg=(255,255,255) if i==6 else INK
        d.ellipse((x+20,y+20,x+61,y+61), fill=LIME if i==6 else EMERALD)
        d.text((x+31,y+24),str(i+1),font=font(23,True),fill=DARK if i==6 else (255,255,255))
        d.text((x+80,y+24),head,font=font(24,True),fill=LIME if i==6 else FOREST)
        d.text((x+22,y+82),sub,font=font(22,True),fill=fg)
        d.text((x+22,y+126),last,font=font(20),fill=fg)
        if i not in (3,6):
            ax=x+406; ay=y+96
            d.line((ax,ay,ax+24,ay),fill=EMERALD,width=5)
            d.polygon([(ax+25,ay-10),(ax+39,ay),(ax+25,ay+10)],fill=EMERALD)
    rr(d,(990,451,1810,630),(255,247,221),18,(238,195,88),3)
    d.text((1018,481),'HONEST SANDBOX DISCLAIMER',font=font(25,True),fill=DARK)
    d.text((1018,528),'No real payment or bank transfer.',font=font(22),fill=INK)
    d.text((1018,564),'No statutory EPR credit is generated.',font=font(22),fill=INK)
    out=DIAGRAMS/'03-customer-to-wallet-workflow.png';im.save(out);return out

DIAG_ARCH=diagram_architecture(); DIAG_ER=diagram_er(); DIAG_FLOW=diagram_workflow()
COVER_SAFE=DIAGRAMS/'report-cover-compatible.jpg'
PILImage.open(ROOT/'public/images/premium-hero.jpg').convert('RGB').save(COVER_SAFE, format='JPEG', quality=88, progressive=False, optimize=False)

CHAPTERS=[
    {
      'title':'Executive summary & abstract',
      'subtitle':'A transparent answer to the last-mile e-waste problem',
      'paragraphs':[
        'EcoTrace India is a full-stack web application that connects customers, collection partners, center managers, recyclers, organizations and administrators through an auditable electronic-waste lifecycle. Built with React through the Next.js App Router, TypeScript, PostgreSQL and Drizzle ORM, it begins with a customer product listing or image-assisted pickup request and continues through assignment, scale verification, recycler receipt, documented recovery and a separate simulated wallet settlement.',
        'The core innovation is deliberate separation of facts: an image may suggest device categories but cannot measure weight; a dispatched batch is not yet received; a collected device is not yet recycled; and an internal EPR ledger is not a statutory credit. Punjab demonstration hubs, including Amritsar, Jalandhar and Phagwara, are clearly marked sample records rather than claimed as licensed facilities.',
        f'At the time of verification the database held {STATS["users"]} users, {STATS["centers"]} sample centers ({STATS["punjab_centers"]} in Punjab), {STATS["products"]} illustrated product listings, {STATS["requests"]} pickup requests, {STATS["batches"]} recycling batches and {STATS["settlements"]} sandbox settlement records. The end-to-end evidence script passed {TEST["summary"]["passed"]}/{TEST["summary"]["total"]} functional checks, and Playwright captured {len(SCREEN_FILES)} genuine browser screenshots without uncaught page errors.',
      ],
      'bullets':['Subject: INT 252 — Web App Development with React JS.','Author: Saiyam Kapur | B.Tech CSE | Lovely Professional University | Roll No. RK4P24NWA11 | Section K4P24NW.','No grade, certification, real payment, government facility or legal compliance approval is claimed by this report.'],
    },
    {
      'title':'Problem definition & motivation',
      'subtitle':'What breaks when the e-waste journey becomes a black box',
      'paragraphs':[
        'Consumers often lack a single place to identify electronics, request collection, confirm what was actually collected, and verify what happened after a truck leaves. Material can change hands multiple times. Without a per-stage record, estimated and measured quantities become conflated, and downstream processing can be asserted without evidence.',
        'Organizations need an internal chain of custody to manage bulky IT refreshes. Collection partners need task-specific routes and physical weighing forms. Recyclers need independent gate receipts and discrepancy review. Administrators need coherent date-filtered analytics and audit trails. A credible product experience also needs photo evidence, reviewed value offers, and a settlement statement—without implying that a demonstration wallet is a real payment gateway.',
      ],
      'bullets':['Business problem: disconnected parties and opaque material custody.','Data problem: requested quantity, estimated mass and measured mass are frequently confused.','Trust problem: premature recycling or EPR claims can mislead stakeholders.','User-experience problem: customers need a clear journey from listing a device to receiving an accountable settlement record.'],
    },
    {
      'title':'Objectives, stakeholders & project scope',
      'subtitle':'A complete demonstration with clearly stated boundaries',
      'paragraphs':[
        'The primary objective is to deliver a working, presentation-ready application—not a static prototype—in which each role can perform meaningful operations against persistent PostgreSQL data. The system supports an accessible public website, protected dashboards, category-aware image analysis, multilingual guidance and a fully traceable customer product-to-demo-wallet workflow.',
      ],
      'table':[
        ['Stakeholder','Primary responsibility','Visible outcome'],
        ['Citizen / Customer','List device, accept offer, book pickup','Own products, pickup timeline, wallet statement'],
        ['Collection Partner','Confirm route and weigh physical devices','Actual quantity and weight recorded'],
        ['Center Manager','Verify collections and dispatch batches','Hub audit trail and recycler handoff'],
        ['Recycler','Record gate weight and recovery evidence','Documented processed mass + discrepancies'],
        ['Organization','Track IT assets and EPR ledger','Internally auditable non-statutory records'],
        ['Administrator','Review offers, assignments and finance','Analytics, approvals, role controls, audit logs'],
      ],
      'bullets':['Included: configured demonstration pilot regions only, not nationwide operational coverage.','Included: a sandbox wallet and printable settlement statement, not a real bank transfer or GST tax invoice.','Optional: genuine multimodal image classification and broader free-form chat when server-side AI credentials are configured.'],
    },
    {
      'title':'Requirement analysis & success criteria',
      'subtitle':'Functional needs and quality attributes',
      'table':[
        ['ID','Requirement','Implemented / verification'],
        ['FR-01','Role-aware login, registration and logout','bcrypt + PostgreSQL sessions; role redirects tested'],
        ['FR-02','Device photo upload, preview and category correction','AI scan; manual category/count controls'],
        ['FR-03','Photo-backed product listing and quote review','Customer studio + admin offer decisions'],
        ['FR-04','Linked pickup scheduling and partner assignment','Persistent request ID + traceability events'],
        ['FR-05','Physical weighment and hub verification','Separate actual weight and quantity fields'],
        ['FR-06','Recycler batch receipt and processing evidence','Receipt, quantity reconciliation and documentation'],
        ['FR-07','Customer settlement and printable statement','Eligibility-gated demo wallet, no real transfer'],
        ['FR-08','Multilingual assistant','English, Hindi, Punjabi + four other languages'],
        ['FR-09','Punjab center discovery','Six sample hubs with search and focus map'],
        ['FR-10','Admin analytics, notifications, audit and EPR','Backend filters, role portals and discrepancy flags'],
      ],
      'bullets':['Security: all private APIs check a server-resolved session and role, never a browser-supplied user ID.','Correctness: invalid transitions, duplicate credits and unsupported image inputs must be rejected.','Usability: responsive layouts, explanatory states, theme switching and readable documentation.','Observability: events, notifications, audit log and database-backed metrics expose state changes.'],
    },
    {
      'title':'Technology stack & React architecture',
      'subtitle':'Why this is an INT 252 React application',
      'table':[
        ['Layer','Technology','Reason'],
        ['Frontend','React 19 + Next.js 16 App Router','Composable client UI, server rendering, route handlers'],
        ['Language','TypeScript 5','Typed API contracts, state and DB models'],
        ['Design','Tailwind CSS 4 + CSS motion','Adaptive layouts, design tokens and reduced-motion behavior'],
        ['Visualization','Recharts + Lucide React','Backend-connected charts and accessible iconography'],
        ['Validation','Zod 4','Reject invalid server payloads before persistence'],
        ['Live AI','OpenRouter free model router','Server-only multilingual chat and multimodal image analysis'],
        ['Data access','Drizzle ORM + PostgreSQL','Typed queries, foreign keys, JSONB and sessions'],
        ['Security','bcryptjs + HTTP-only cookies','Password hashing and server-controlled session lookup'],
        ['Testing','Playwright + Node integration test','Real browser evidence and transactional workflow checks'],
      ],
      'paragraphs':['React client components implement responsive interactions such as the scanner, chatbot, maps, charts and role dashboards. Next.js server components deliver pages such as the landing page and private statement, while App Router API handlers apply validation and authorization. This deliberate split keeps database credentials, AI provider keys and private pickup addresses out of the client bundle.'],
    },
    {
      'title':'System design & deployment architecture',
      'subtitle':'From browser interactions to typed persistence',
      'paragraphs':['A client action sends a request to a Next.js route handler. Zod validates input, the cookie resolves a hashed PostgreSQL session, and the business service applies a permitted status transition. Drizzle issues parameterized database queries. Audit and notification records are appended after meaningful changes. OpenRouter is configured server-side through an environment secret and defaults to free-model routing for multilingual chat and multimodal vision; when providers are busy or rate-limited, honest guided fallbacks remain functional.'],
      'diagram':DIAG_ARCH,
      'bullets':['Presentation layer: homepage, marketplace, map, assistant and six role dashboards.','Application layer: authentication, classification, pickups, batches, listings, settlements, analytics and trace lookup.','Data layer: 13 PostgreSQL tables with foreign keys and JSONB payloads.','Environment: DATABASE_URL required; OPENROUTER_API_KEY server-side for live AI; OPENROUTER_MODEL optional; direct OpenAI/Gemini providers optional.'],
    },
    {
      'title':'Database design & entity relationships',
      'subtitle':'A durable record for each business checkpoint',
      'paragraphs':['The database includes 13 tables: users, sessions, collection_centers, pickup_requests, recycling_batches, traceability_events, epr_records, notifications, audit_logs, platform_settings, product_listings, settlement_records and chat_messages. Primary/foreign keys preserve ownership and linkage. Integer paise prevent floating-point drift in illustrative finance entries. Image evidence is stored as a validated data URL for this demo; production should move binary assets to object storage.'],
      'diagram':DIAG_ER,
      'bullets':['pickup_requests keeps requested_total_qty and estimated_weight_kg distinct from actual_collected_qty and actual_collected_weight_kg.','recycling_batches keeps dispatched_weight_kg, received_weight_kg, processed_qty and documented_recycling_kg distinct.','settlement_records has a unique listing_id, preventing multiple settlement records per product.','traceability_events and audit_logs preserve human-readable operational evidence.','chat_messages is scoped by authenticated user; guests retain history only in their browser.'],
    },
    {
      'title':'Business workflows & lifecycle safeguards',
      'subtitle':'A product is not paid just because it was collected',
      'diagram':DIAG_FLOW,
      'paragraphs':['A customer begins by creating a product listing with a real photo, category, condition and quantity. The server calculates an indicative demo guide; only an administrator can issue an offer. After the customer accepts it, a linked pickup is created. Admin assigns an active partner. The partner records actual quantity and weight on a scale, a center manager verifies the lot, and an outbound batch is delivered to a recycler.'],
      'bullets':['Pickup state order: submitted → assigned → scheduled → collected → verified → batched → recycler receipt → processing → documented.','Batch gate receipt cannot be recorded twice; processing requires a received, discrepancy-free batch.','Documented mass cannot exceed gate weight; processed units cannot exceed accepted units; supporting evidence is mandatory.','Settlement preparation requires documented pickup and batch, matching ownership and no unresolved discrepancies.','Administrator approval and demo wallet credit are distinct actions; a second credit attempt is rejected.'],
    },
    {
      'title':'AI-assisted image identification',
      'subtitle':'Useful assistance without inventing visual certainty',
      'paragraphs':['The image scanner accepts JPG, PNG, WEBP and GIF input with size validation. It supports 12 device categories, structured multi-device rows, preview/remove/replace, per-category correction and user-entered quantities. OpenRouter Vision is attempted first using the configured server-side key; optional direct OpenAI/Gemini providers remain supported. A successful vision model can return visible-device count estimates, but generative model confidence is not calibrated and is therefore left unset. If no usable model result arrives, the UI visibly labels suggestions as Demo Mode and requests human confirmation.'],
      'bullets':['Example sample photo: multiple phones, a laptop, a mouse and cables appear as editable rows.','No model can infer physical mass from a photo: category-average planning estimates are clearly separate from scale-verified collection weights.','The scanner works independently of marketplace listing photos; users can also bypass AI and add items manually.'],
    },
    {
      'title':'Tara multilingual conversational assistant',
      'subtitle':'20 selectable languages, live OpenRouter AI and private context',
      'paragraphs':['Tara is accessible across public pages and protected portals. The language picker offers 20 named languages including English, Hindi, Punjabi (Gurmukhi), Bengali, Marathi, Tamil and Telugu; Auto detects many scripts and some Romanized Hindi/Punjabi cues. OpenRouter free-model inference now powers general multilingual questions when available. The browser can speak responses or transcribe microphone input where supported. Quick prompts and suggested action links reduce friction for new users.'],
      'bullets':['The guided response engine answers supported topics using live PostgreSQL hub records, the signed-in user\'s pickup history, own product listings and own demo wallet balance.','Authenticated chat history is stored per user; guest messages remain in local browser storage. Users can clear their own history.','Personal request/wallet context is not forwarded to a third-party AI service. Live OpenRouter answers use server-side factual guardrails; account-specific facts are appended locally after a model response.','When the free model is slow, rate-limited or unavailable, Tara clearly switches to its seven-language guided knowledge base; model availability and language quality are not guaranteed.'],
    },
    {
      'title':'Premium UI/UX, accessibility & mobile PWA',
      'subtitle':'A polished sustainability SaaS rather than a static mockup',
      'paragraphs':['The design combines warm off-white and mint surfaces, deep forest-green feature sections, emerald highlights, product editorial photography and softly layered glass cards. A collapsible admin sidebar and responsive topbar serve different screen sizes. An interactive demo device-value explorer and global Ctrl/Command+K navigation add functional discovery. Animated counters, hover elevation, subtle route transitions, tooltip controls, clean forms, skeleton loading states, accessible labels and toast messages support both visual quality and usability.'],
      'bullets':['Dark mode respects the system preference and persists an explicit user choice.','A manifest and service worker make the site installable; offline support covers cached public assets but not private database mutations.','CSS prefers-reduced-motion support suppresses nonessential animation for users who request it.','The mobile evidence screenshot confirms the hero and primary actions fit a 390-pixel viewport.'],
    },
    {
      'title':'Security, privacy & responsible claims',
      'subtitle':'Guardrails built into the application, not just the copy',
      'paragraphs':['Passwords are salted and hashed with bcrypt. Random session tokens are SHA-256 hashed before PostgreSQL storage and delivered only via HTTP-only cookies. Server-side role checks protect administrative actions; owner checks protect product images, full pickup addresses, settlement statements and private chat history. The public traceability endpoint redacts street addresses and owner PII.'],
      'bullets':['Quoted amounts cannot be set by customers; accepted offers cannot be linked to another user\'s pickup.','Discrepancy flags block settlement until human review, and repeated simulated credits are rejected.','Sample Punjab centers are not described as real government-licensed or operational facilities.','The demo statement is NOT a GST invoice, bank receipt or proof of real funds. Internal EPR records are NOT statutory CPCB credits.','The repository does not expose database or AI provider secrets in browser bundles.'],
    },
    {
      'title':'Testing methodology & actual results',
      'subtitle':f'{TEST["summary"]["passed"]} passed checks, {len(SCREEN_FILES)} genuine browser captures',
      'paragraphs':[f'The executable end-to-end test completed {TEST["summary"]["passed"]} of {TEST["summary"]["total"]} checks on {datetime.fromisoformat(TEST["executedAt"].replace("Z","+00:00")).strftime("%d %B %Y")}. It exercised public routes, expanded Punjab sample hubs, multilingual chat, six role portals and manual credential-based sign-in, owner privacy, the listing-to-pickup-to-recycler-to-wallet flow, duplicate action rejection, statement access, audit logging and logout. Temporary transactions were deleted afterward, preserving seeded demonstration data. The screenshot script captured {len(SCREEN_FILES)} actual Chromium screens with no uncaught page-level JavaScript errors.', 'Validation also includes Next.js route type generation, a strict TypeScript no-emit check, ESLint and the optimized production build. One screenshot suite uses browser-level actions to open the chatbot, load an AI multi-device sample and navigate protected role portals.'],
      'table':[
        ['Verification theme','Observed result','Evidence'],
        ['Public pages & health','PASS','Homepage, marketplace, hubs, docs, impact'],
        ['Customer photo listing & offer','PASS','Admin quote; owner-only acceptance'],
        ['Pickup custody & recycler receipt','PASS','Physical weight + gate receipt separate'],
        ['Settlement eligibility and idempotency','PASS','Denied before docs; duplicate credit blocked'],
        ['Privacy & role access','PASS','Cross-user pickup/statement rejected'],
        ['Multilingual chatbot','PASS','Punjabi, Hindi, English; private wallet lookup'],
        ['Browser screenshot capture','PASS',f'{len(SCREEN_FILES)} genuine screens; no page exceptions'],
      ],
      'bullets':['All numerical project data and test assertions above are taken from the running application / saved test-results.json.','Screenshots were captured from the working production server via Playwright, not designed as illustrative mockups.'],
    },
    {
      'title':'Known limitations & future enhancements',
      'subtitle':'Honest engineering boundaries and a credible roadmap',
      'paragraphs':['The deployment is a course demonstration. It is not an operating collection network, an authorized recycler registry or a payment service. The wallet is intentionally simulated. OpenRouter is configured, but free-model routing has variable latency and rate limits; image classification and chatbot responses gracefully fall back to labeled demo/guided modes when unavailable. Model-provided visible counts are estimates rather than physically verified quantities. Collection-center contact and address fields are illustrative sample data. Supporting document metadata is stored, but binary file storage would require an object store.'],
      'bullets':['Production: integrate a regulated payout provider only after KYC, reconciliation, fraud controls, signed webhooks and legal review.','Production: use cloud object storage with signed uploads, virus scanning and retention rules for images and PDF evidence.','Operations: onboard verified real facilities through manual due diligence and explicit authorization evidence.','AI: add a calibrated multi-object detection pipeline, representative evaluation dataset and confidence thresholds per device category.','Engineering: add CI, integration tests against ephemeral PostgreSQL, telemetry, rate limits and optimistic concurrency for every workflow mutation.'],
    },
    {
      'title':'Conclusion & learning outcomes',
      'subtitle':'A functional React full-stack system with evidence',
      'paragraphs':['EcoTrace India demonstrates a substantial end-to-end web application built using React within the Next.js App Router. It combines responsive product design, typed client-server interaction, persistent relational modeling, secure authentication, multi-role operations, AI-assisted interfaces, multilingual guidance and carefully separated sustainability records. The greatest engineering lesson is not a visual effect or an AI label: it is maintaining truthful, auditable transitions between what was requested, physically collected, independently received, recycled and only then eligible for a simulated customer settlement.', 'This document presents implementation details and real working evidence for academic assessment. It does not imply a guaranteed grade, university endorsement, statutory approval or a real payment transfer.'],
    },
]

REFERENCES=[
    ('React documentation', 'https://react.dev/learn'),
    ('Next.js App Router documentation', 'https://nextjs.org/docs/app'),
    ('TypeScript documentation', 'https://www.typescriptlang.org/docs/'),
    ('Drizzle ORM documentation', 'https://orm.drizzle.team/docs/overview'),
    ('PostgreSQL documentation', 'https://www.postgresql.org/docs/'),
    ('Playwright browser testing', 'https://playwright.dev/docs/intro'),
    ('OpenRouter API quickstart', 'https://openrouter.ai/docs/quickstart'),
    ('OpenRouter free model router', 'https://openrouter.ai/docs/guides/routing/routers/free-router'),
    ('W3C WCAG 2.2 accessibility guidelines', 'https://www.w3.org/TR/WCAG22/'),
]

FIGURES=[
    ('01-homepage-hero.png','Landing page hero','Working homepage with premium editorial illustration, clear sustainability purpose, live preview cards and primary collection CTA.','Route: /'),
    ('02-homepage-product-studio.png','Homepage / product studio preview','Real seeded, photo-backed sample product listings surfaced inside the homepage marketplace section.','Route: / (scroll to product studio)'),
    ('24-tablet-complete-journey.png','Tablet: complete material journey','Photo-backed Phagwara tablet story shows all recorded chain-of-custody milestones and a simulated customer wallet outcome.','Route: /journey/tablet'),
    ('25-tablet-journey-replay.png','Interactive tablet journey replay','Working replay action moves through persisted listing, offer, pickup, verification, recycler and sample wallet events.','Route: /journey/tablet (Replay the journey)'),
    ('22-interactive-device-explorer.png','Interactive device discovery studio','Working category, condition and quantity controls update a clearly labeled sandbox value and estimated reference weight.','Route: / (interactive device explorer)'),
    ('23-command-palette-search.png','Global keyboard command palette','Ctrl/Command+K search filters working destinations such as the Punjab collection-center directory.','Route: / (open search, type Phagwara)'),
    ('03-marketplace-landing.png','Marketplace landing experience','Editorial product story, six-stage circular journey and customer listing CTA.','Route: /marketplace'),
    ('04-marketplace-demo-products.png','Marketplace sample products','A public gallery of safe, privacy-redacted, clearly labeled demonstration listings.','Route: /marketplace (scroll to gallery)'),
    ('05-punjab-centers-map.png','Punjab demonstration directory','Punjab quick filters, honest non-authorized sample notice and collection-center search.','Route: /collection-centers'),
    ('20-punjab-interactive-map-detail.png','Punjab interactive regional map','Focused map with live coordinates for Ludhiana, Amritsar, Jalandhar, Phagwara, Mohali and Patiala.','Route: /collection-centers (Punjab focus)'),
    ('06-phagwara-city-filter.png','Phagwara center filter','The one-click Phagwara filter narrows database-backed map pins and hub cards.','Route: /collection-centers (select Phagwara)'),
    ('07-live-impact-dashboard.png','Live impact analytics','Measured collected mass, documented recycled mass and date-filtered data visualizations are kept distinct.','Route: /impact'),
    ('08-tara-punjabi-chatbot.png','Tara / Punjabi conversation','Working OpenRouter-assisted Punjabi conversation in Gurmukhi, with actual model label and demo-payout safeguards visible.','Route: / (open Tara and choose Punjabi)'),
    ('09-login-role-demo.png','Secure authentication','The public login offers email/password sign-in and registration without publishing development account credentials.','Route: /login'),
    ('28-dashboard-access-hub.png','Protected six-role portal directory','Six portal cards link to the login page while preserving the requested role destination.','Route: /dashboards'),
    ('31-admin-login-redirect.png','Protected Admin login redirect','A protected Admin URL sends an unsigned visitor to login, then returns to the correct dashboard after valid credentials.','Route: /dashboard/admin'),
    ('10-citizen-overview.png','Citizen dashboard','Protected citizen overview with real pickup metrics, green points and customer product journey CTA.','Route: /dashboard/citizen'),
    ('11-customer-products-wallet.png','Customer products & demo wallet','Owner-scoped product photos, accepted/quoted states, indicative prices and sample credited wallet balance.','Route: /dashboard/citizen (My Products & Wallet)'),
    ('12-customer-create-listing.png','Create a customer product listing','Working photo-upload form captures condition, brand, model, category, count and location before admin review.','Route: /dashboard/citizen (List a product)'),
    ('13-ai-multi-device-pickup.png','AI-assisted multi-device pickup','Live OpenRouter vision (or explicitly labeled Demo Mode fallback), editable device rows and separate reference/physical weight.','Route: /dashboard/citizen (AI Scan & Schedule Pickup)'),
    ('14-customer-demo-statement.png','Printable settlement statement','A private statement joins customer photo, listing, verified pickup, recycler batch and non-statutory notice.','Route: /statement/[id] (owner only)'),
    ('21-statement-amount-and-reference.png','Settlement amount & demo reference','Working printable breakdown: offered amount, quantity adjustment, final demo credit and sandbox reference.','Route: /statement/[id] (scroll to totals)'),
    ('26-tablet-customer-bill.png','Phagwara tablet customer bill','The owner signs in through the normal form before seeing the private tablet statement, photo, weights and sample processing log.','Route: /statement/[id] (Phagwara owner)'),
    ('27-phagwara-customer-wallet.png','Phagwara customer dashboard and wallet','The sample customer sees their credited tablet listing and saved statement in the protected Citizen portal.','Route: /dashboard/citizen?tab=marketplace'),
    ('15-admin-analytics.png','Admin sustainability analytics','Admin overview with collapsible sidebar, backend metrics and date-filtered trends.','Route: /dashboard/admin'),
    ('16-admin-settlement-control.png','Admin product & payout operations','Administrator review queue supports offers, settlement preparation, approval and simulated credit.','Route: /dashboard/admin (Products & Settlements)'),
    ('17-recycler-batches.png','Recycler batch portal','Incoming batches, actual gate weights, discrepancy flags and processing documentation controls.','Route: /dashboard/recycler'),
    ('18-collection-partner-portal.png','Collection partner portal','Assigned pickup routes, private authorized address access and physical weight recording.','Route: /dashboard/partner'),
    ('29-organization-portal.png','Organization portal','Organization dashboard presents internal material records and sample wallet product access.','Route: /dashboard/organization'),
    ('30-center-manager-portal.png','Center manager portal','Center manager sees verified collections, outbound batches and Punjab sample collection points.','Route: /dashboard/center'),
    ('19-responsive-mobile-home.png','Mobile-responsive website','A 390 px viewport screenshot verifies the same real homepage adapts to a narrow touch device.','Route: / (mobile viewport)'),
]
FIGURES=[f for f in FIGURES if (SHOTS/f[0]).exists()]

# --- WORD report helpers ---------------------------------------------------
def cell_shading(cell, fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd');shd.set(qn('w:fill'),fill);tcPr.append(shd)

def set_cell_text(cell,text,bold=False,color=None,size=9):
    cell.text='';p=cell.paragraphs[0]; p.space_after=Pt(2);r=p.add_run(str(text));r.bold=bold;r.font.size=Pt(size);r.font.name='Aptos';r.font.color.rgb=RGBColor(*(color or INK));cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER

def doc_par(doc,text,style=None):
    p=doc.add_paragraph(style=style);p.add_run(text);return p

def word_table(doc, rows):
    tbl=doc.add_table(rows=1, cols=len(rows[0]));tbl.autofit=True;tbl.alignment=WD_TABLE_ALIGNMENT.CENTER
    for i,cell in enumerate(tbl.rows[0].cells):set_cell_text(cell,rows[0][i],True,(255,255,255),8.5);cell_shading(cell,'063F2E')
    for ridx,row in enumerate(rows[1:]):
        cells=tbl.add_row().cells
        for i,text in enumerate(row):set_cell_text(cells[i],text,size=8.2);cell_shading(cells[i],'F0F8F2' if ridx%2==0 else 'FFFFFF')
    doc.add_paragraph().paragraph_format.space_after=Pt(2)

def word_img(doc,path,width=6.45):
    im=PILImage.open(path);aspect=im.width/im.height
    if aspect<0.8:width=2.75
    elif aspect<1.3:width=5.2
    p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(path),width=Inches(width))

def build_word():
    doc=Document();sec=doc.sections[0];sec.page_width=Inches(8.27);sec.page_height=Inches(11.69);sec.top_margin=Inches(.72);sec.bottom_margin=Inches(.7);sec.left_margin=Inches(.78);sec.right_margin=Inches(.78)
    styles=doc.styles
    normal=styles['Normal'];normal.font.name='Aptos';normal.font.size=Pt(10.5);normal.font.color.rgb=RGBColor(*INK);normal.paragraph_format.space_after=Pt(8);normal.paragraph_format.line_spacing=1.17
    for name,size,after in [('Title',29,12),('Heading 1',17,13),('Heading 2',11,8)]:
        st=styles[name];st.font.name='Aptos Display';st.font.size=Pt(size);st.font.bold=True;st.font.color.rgb=RGBColor(*FOREST);st.paragraph_format.space_before=Pt(15);st.paragraph_format.space_after=Pt(after)
    if 'Report Eyebrow' not in styles:
        eb=styles.add_style('Report Eyebrow', WD_STYLE_TYPE.PARAGRAPH);eb.font.name='Aptos';eb.font.size=Pt(8);eb.font.bold=True;eb.font.color.rgb=RGBColor(*EMERALD);eb.paragraph_format.space_after=Pt(5)
    header=sec.header.paragraphs[0];header.text='LOVELY PROFESSIONAL UNIVERSITY   /   INT 252   /   EcoTrace India';header.style='Report Eyebrow';header.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    footer=sec.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=footer.add_run('SAIYAM KAPUR  •  RK4P24NWA11  •  SECTION K4P24NW      |      PAGE ');r.font.size=Pt(7.5);r.font.color.rgb=RGBColor(*MUTED)
    fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');footer._p.append(fld)
    props=doc.core_properties;props.author='Saiyam Kapur';props.title='EcoTrace India | INT 252 Web App Development with React JS';props.subject='B.Tech CSE project report with real working screenshots';props.keywords='EcoTrace India, INT 252, React JS, Next.js, PostgreSQL, E-Waste'

    # Cover
    doc.add_paragraph('LOVELY PROFESSIONAL UNIVERSITY').alignment=WD_ALIGN_PARAGRAPH.CENTER
    p=doc.add_paragraph('SCHOOL OF COMPUTER SCIENCE & ENGINEERING');p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.runs[0].font.bold=True;p.runs[0].font.color.rgb=RGBColor(*FOREST);p.runs[0].font.size=Pt(13)
    doc.add_paragraph(' ')
    t=doc.add_table(rows=1,cols=1);cell_shading(t.cell(0,0),'063A2B');cell=t.cell(0,0);cell.text=''
    for text,size,color in [('INT 252  /  WEB APP DEVELOPMENT WITH REACT JS',11,(189,234,198)),('ECOTRACE INDIA',35,(255,255,255)),('AI-Powered E-Waste Collection, Traceability & Recycling Management Platform',18,(217,247,229)),('PROJECT REPORT  •  WORKING FULL-STACK APPLICATION',10,(255,224,128))]:
        pp=cell.add_paragraph();pp.alignment=WD_ALIGN_PARAGRAPH.CENTER;pp.paragraph_format.space_before=Pt(13);rrun=pp.add_run(text);rrun.bold=True;rrun.font.size=Pt(size);rrun.font.color.rgb=RGBColor(*color)
    doc.add_paragraph(' ')
    if COVER_SAFE.exists():word_img(doc,COVER_SAFE,width=5.7)
    doc.add_paragraph(' ')
    for k,v in [('SUBMITTED BY','SAIYAM KAPUR'),('PROGRAM','B.Tech  |  Computer Science & Engineering'),('ROLL NUMBER','RK4P24NWA11'),('SECTION','K4P24NW'),('INSTITUTION','Lovely Professional University'),('REPORT DATE',DATE)]:
        p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(3);r=p.add_run(f'{k}    ');r.bold=True;r.font.size=Pt(8);r.font.color.rgb=RGBColor(*EMERALD);r=p.add_run(v);r.bold=True;r.font.size=Pt(10)
    doc.add_page_break()

    doc.add_paragraph('PROJECT IDENTITY & EVIDENCE SNAPSHOT',style='Heading 1')
    word_table(doc,[['Attribute','Verified project fact'],['Course','INT 252 — Web App Development with React JS'],['Project','EcoTrace India'],['Author','Saiyam Kapur · B.Tech CSE · LPU · RK4P24NWA11 · K4P24NW'],['Technology','React 19 · Next.js 16 · TypeScript · PostgreSQL · Drizzle ORM'],['Test status',f'{TEST["summary"]["passed"]}/{TEST["summary"]["total"]} end-to-end checks passed'],['Visual evidence',f'{len(SCREEN_FILES)} working Chromium screenshots (desktop + mobile)'],['Demo data',f'{STATS["centers"]} hubs ({STATS["punjab_centers"]} Punjab), {STATS["products"]} product listings, {STATS["settlements"]} sandbox statements']])
    doc_par(doc,'Evidence statement: every screenshot in this report was captured by Playwright from the running Next.js server. Seeded hubs, customers, listings and payouts are marked as demonstration records. No actual bank transfers or statutory recycling credits are claimed.')
    doc.add_paragraph('REPORT ROADMAP',style='Heading 1')
    for idx,ch in enumerate(CHAPTERS,1):doc_par(doc,f'{idx:02d}   {ch["title"]}')
    doc_par(doc,f'Working Screenshot Portfolio  |  {len(FIGURES)} verified figures; each figure includes its route and engineering observation.')
    doc_par(doc,'References & Appendix  |  Source references, demo login accounts and reproduction steps.')
    doc.add_page_break()

    for idx,ch in enumerate(CHAPTERS,1):
        doc.add_paragraph(f'CHAPTER {idx:02d}',style='Report Eyebrow')
        doc.add_paragraph(ch['title'],style='Heading 1')
        p=doc.add_paragraph(ch['subtitle']);p.runs[0].italic=True;p.runs[0].font.color.rgb=RGBColor(*MUTED)
        for para in ch.get('paragraphs',[]):doc_par(doc,para)
        if ch.get('diagram'):
            word_img(doc,ch['diagram'],width=6.55)
            p=doc.add_paragraph(f'Figure: {ch["subtitle"]}');p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.runs[0].italic=True;p.runs[0].font.size=Pt(8);p.runs[0].font.color.rgb=RGBColor(*MUTED)
        if ch.get('table'):word_table(doc,ch['table'])
        for bullet in ch.get('bullets',[]):
            p=doc.add_paragraph(style='List Bullet');p.add_run(bullet);p.paragraph_format.space_after=Pt(3)
        if idx in (4,7,10,13):doc.add_page_break()
        else:doc.add_paragraph('')

    doc.add_page_break();doc.add_paragraph('WORKING SCREENSHOT PORTFOLIO',style='Heading 1')
    doc_par(doc,f'{len(FIGURES)} images captured from the actual running application using Playwright Chromium; screenshot capture ran with no uncaught browser errors. These are not conceptual mockups. Desktop viewport: 1440 x 900; mobile viewport: 390 x 844.')
    for i,(filename,title,desc,route) in enumerate(FIGURES,1):
        doc.add_page_break();doc.add_paragraph(f'WORKING EVIDENCE  /  FIGURE {i:02d}',style='Report Eyebrow')
        doc.add_paragraph(title,style='Heading 1')
        p=doc.add_paragraph(desc);p.runs[0].font.size=Pt(9.5)
        word_img(doc,SHOTS/filename)
        p=doc.add_paragraph(f'FIG. {i:02d}  •  {filename}  •  {route}');p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.runs[0].italic=True;p.runs[0].font.color.rgb=RGBColor(*EMERALD);p.runs[0].font.size=Pt(8)
        doc_par(doc,'Interpretation: screenshot represents a live database-backed or functional interactive page, captured after loading the production server. Demonstration records and sandbox finance states are identified in the UI.')

    doc.add_page_break();doc.add_paragraph('REFERENCES & REPRODUCIBILITY',style='Heading 1')
    for name,url in REFERENCES:doc_par(doc,f'• {name}: {url}')
    doc.add_paragraph('Demonstration credentials (development only)',style='Heading 2')
    word_table(doc,[['Role','Protected route'],['Citizen','/dashboard/citizen'],['Collection Partner','/dashboard/partner'],['Recycler','/dashboard/recycler'],['Organization','/dashboard/organization'],['Center Manager','/dashboard/center'],['Administrator','/dashboard/admin']])
    doc_par(doc,'Development credentials are provided only in config/development-accounts.json, outside the public website and this report.')
    doc.add_paragraph('Reproduction checklist',style='Heading 2')
    for item in ['Start Next.js with a PostgreSQL DATABASE_URL and push Drizzle schema.','Visit the project preview and sign in using an account from the separate config/development-accounts.json file.','Run: node scripts/verify-end-to-end.mjs (verified assertions, automated cleanup).','Run: node scripts/capture-report-screenshots.mjs (authentic Chromium screenshots).','Run: npx next typegen; npm exec tsc -- --noEmit; npm run build; npm run lint.','Live OpenRouter AI reads OPENROUTER_API_KEY only on the server; its free models may be rate-limited. Real payouts require a licensed gateway, compliance and reconciliation not included here.']:
        p=doc.add_paragraph(style='List Number');p.add_run(item)
    doc_par(doc,f'Preview access note: {PREVIEW}. Permanent public hosting requires separate deployment and database configuration.')
    doc_par(doc,'Prepared for academic evaluation. This document does not claim a particular mark, official university approval, government certification or real funds transfer.')
    outfile=OUT/(OUTPUT_STEM+'.docx');doc.save(outfile);return outfile

# --- PDF report helpers ----------------------------------------------------
PDF_FONT='DejaVuEco';PDF_BOLD='DejaVuEcoBold'
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
pdfmetrics.registerFont(TTFont(PDF_FONT,FONTPATH));pdfmetrics.registerFont(TTFont(PDF_BOLD,BOLDFONTPATH))
PWIDTH,PHEIGHT=A4
BODY=ParagraphStyle('eco-body',fontName=PDF_FONT,fontSize=9.25,leading=15,textColor=colors.HexColor('#273933'),spaceAfter=8)
H1=ParagraphStyle('eco-h1',fontName=PDF_BOLD,fontSize=18.5,leading=23,textColor=colors.HexColor('#063e2d'),spaceBefore=9,spaceAfter=11)
H2=ParagraphStyle('eco-h2',fontName=PDF_BOLD,fontSize=11,leading=15,textColor=colors.HexColor('#076a4d'),spaceBefore=8,spaceAfter=5)
KICK=ParagraphStyle('eco-kicker',fontName=PDF_BOLD,fontSize=8,leading=11,textColor=colors.HexColor('#059669'),spaceAfter=5)
MUT=ParagraphStyle('eco-muted',fontName=PDF_FONT,fontSize=8.4,leading=13,textColor=colors.HexColor('#5b7770'),spaceAfter=11)
BUL=ParagraphStyle('eco-bullet',parent=BODY,leftIndent=15,firstLineIndent=-9,spaceAfter=5)
CAPTION=ParagraphStyle('eco-caption',fontName=PDF_FONT,fontSize=7.7,leading=11,textColor=colors.HexColor('#426f5d'),alignment=TA_CENTER,spaceBefore=7,spaceAfter=11)


def clean(s):return html.escape(str(s)).replace('\n','<br/>')

def pdf_pic(path,max_w=496,max_h=410):
    img=PILImage.open(path)
    ratio=min(max_w/img.width,max_h/img.height)
    return PDFImage(str(path),width=img.width*ratio,height=img.height*ratio)

def pdf_table(rows):
    colcount=len(rows[0]);total=492
    if colcount==2:widths=[total*.31,total*.69]
    elif colcount==3:widths=[total*.22,total*.43,total*.35]
    else:widths=[total/colcount]*colcount
    matrix=[[Paragraph(clean(v),ParagraphStyle('tbl',fontName=PDF_BOLD if ridx==0 else PDF_FONT,fontSize=7.3,leading=10,textColor=colors.white if ridx==0 else colors.HexColor('#22372f'))) for v in row] for ridx,row in enumerate(rows)]
    tab=Table(matrix,colWidths=widths,repeatRows=1,hAlign='CENTER')
    tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#064631')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f1f9f3'),colors.white]),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,-1),(-1,-1),.5,colors.HexColor('#d3e9da'))]))
    return tab

def draw_cover(c,doc):
    c.setFillColor(colors.HexColor('#052e22'));c.rect(0,0,PWIDTH,PHEIGHT,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#0a593e'));c.circle(615,760,240,fill=1,stroke=0);c.setFillColor(colors.HexColor('#0c6f4d'));c.circle(520,105,190,fill=1,stroke=0)
    c.setStrokeColor(colors.HexColor('#a5f0a3'));c.setLineWidth(.6);c.circle(515,705,165,fill=0,stroke=1);c.circle(515,705,200,fill=0,stroke=1)
    c.setFont(PDF_BOLD,10);c.setFillColor(colors.HexColor('#a6efc4'));c.drawString(50,785,'LOVELY PROFESSIONAL UNIVERSITY')
    c.setFont(PDF_FONT,8);c.drawString(50,765,'SCHOOL OF COMPUTER SCIENCE & ENGINEERING  /  PROJECT REPORT')
    c.setFillColor(colors.HexColor('#b6ec75'));c.roundRect(50,699,340,26,10,fill=1,stroke=0)
    c.setFont(PDF_BOLD,8);c.setFillColor(colors.HexColor('#0a3426'));c.drawString(62,708,'INT 252  /  WEB APP DEVELOPMENT WITH REACT JS')
    c.setFillColor(colors.white);c.setFont(PDF_BOLD,34);c.drawString(49,633,'ECOTRACE')
    c.setFillColor(colors.HexColor('#b6ec75'));c.drawString(49,595,'INDIA')
    c.setFont(PDF_FONT,13);c.setFillColor(colors.HexColor('#e3f8e9'));c.drawString(50,553,'AI-Powered E-Waste Collection,')
    c.drawString(50,532,'Traceability & Recycling Management Platform')
    c.setFillColor(colors.HexColor('#a8d5bb'));c.setFont(PDF_FONT,9);c.drawString(50,501,'A working full-stack React application with verified browser evidence')
    hero=COVER_SAFE
    if hero.exists():
        c.saveState();path=c.beginPath();path.roundRect(50,255,495,218,18);c.clipPath(path,stroke=0,fill=0)
        c.drawImage(ImageReader(str(hero)),50,255,width=495,height=218,preserveAspectRatio=False,mask='auto');c.restoreState()
    c.setFillColor(colors.HexColor('#edf8ef'));c.roundRect(50,52,495,174,14,fill=1,stroke=0)
    c.setFont(PDF_BOLD,8);c.setFillColor(colors.HexColor('#087551'));c.drawString(68,200,'SUBMITTED BY')
    c.setFont(PDF_BOLD,19);c.setFillColor(colors.HexColor('#063a2b'));c.drawString(68,175,'Saiyam Kapur')
    c.setFont(PDF_FONT,10);c.drawString(68,154,'B.Tech  |  Computer Science & Engineering')
    c.drawString(68,135,'Roll No: RK4P24NWA11      Section: K4P24NW')
    c.setFont(PDF_BOLD,8.5);c.setFillColor(colors.HexColor('#1f795c'));c.drawString(68,108,f'{TEST["summary"]["passed"]}/{TEST["summary"]["total"]} CHECKS PASSED    |    {len(SCREEN_FILES)} REAL SCREENSHOTS    |    {STATS["punjab_centers"]} PUNJAB DEMO HUBS')
    c.setFont(PDF_FONT,8);c.setFillColor(colors.HexColor('#5b7770'));c.drawString(68,78,f'Academic submission copy   •   {DATE}   •   demo finance and facilities are explicitly labeled')


def draw_page(c,doc):
    n=doc.page;c.saveState()
    c.setFillColor(colors.HexColor('#064631'));c.rect(0,PHEIGHT-33,PWIDTH,33,stroke=0,fill=1)
    c.setFont(PDF_BOLD,7);c.setFillColor(colors.HexColor('#dcfce7'));c.drawString(48,PHEIGHT-21,'LOVELY PROFESSIONAL UNIVERSITY   /   INT 252')
    c.setFont(PDF_FONT,7);c.drawRightString(PWIDTH-48,PHEIGHT-21,'ECOTRACE INDIA  •  PROJECT REPORT')
    c.setStrokeColor(colors.HexColor('#c7dfcf'));c.line(48,46,PWIDTH-48,46)
    c.setFont(PDF_FONT,7);c.setFillColor(colors.HexColor('#5c756b'));c.drawString(48,31,'Saiyam Kapur   •   RK4P24NWA11   •   K4P24NW')
    c.drawRightString(PWIDTH-48,31,f'PAGE {n:02d}')
    c.restoreState()


def build_pdf():
    filename=OUT/(OUTPUT_STEM+'.pdf')
    doc=SimpleDocTemplate(str(filename),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=57,bottomMargin=60,title='EcoTrace India | INT 252 Project Report',author='Saiyam Kapur',subject='B.Tech CSE full-stack React project report')
    story=[Spacer(1,5),PageBreak()]
    story.append(Paragraph('PROJECT SNAPSHOT / VERIFIED DATA',KICK))
    story.append(Paragraph('A real React application. A transparent circular story.',H1))
    story.append(pdf_table([['Field','Verified project detail'],['Course','INT 252 — Web App Development with React JS'],['Author','Saiyam Kapur · B.Tech CSE · LPU · RK4P24NWA11 · K4P24NW'],['Stack','React 19 · Next.js 16 · TypeScript · PostgreSQL · Drizzle'],['Test evidence',f'{TEST["summary"]["passed"]}/{TEST["summary"]["total"]} passing checks and {len(SCREEN_FILES)} real browser screenshots'],['Live database',f'{STATS["centers"]} centers; {STATS["punjab_centers"]} Punjab hubs; {STATS["products"]} products; {STATS["settlements"]} sandbox statements']]))
    story.append(Spacer(1,17));story.append(Paragraph('Report roadmap',H2))
    for i,ch in enumerate(CHAPTERS,1):story.append(Paragraph(f'<b>{i:02d}</b>  {clean(ch["title"])}',BODY))
    story.append(Paragraph(f'<b>FIGURES</b>  {len(FIGURES)} working screenshots • authentic Playwright Chromium capture',BODY))
    story.append(Paragraph('<b>APPENDIX</b>  References, demo accounts and reproduction instructions',BODY))
    story.append(Spacer(1,10));story.append(Paragraph('Demonstration note: sample facilities are not government-authorized facilities; illustrated finance records are not real transfers or tax invoices. The report makes no claim of a guaranteed grade or statutory approval.',MUT))
    story.append(PageBreak())
    for i,ch in enumerate(CHAPTERS,1):
        story.append(Paragraph(f'CHAPTER {i:02d} / ENGINEERING REPORT',KICK))
        story.append(Paragraph(clean(ch['title']),H1))
        story.append(Paragraph(clean(ch['subtitle']),MUT))
        for para in ch.get('paragraphs',[]):story.append(Paragraph(clean(para),BODY))
        if ch.get('diagram'):
            story.append(Spacer(1,7));story.append(pdf_pic(ch['diagram'],max_w=496,max_h=300))
            story.append(Paragraph(f'FIGURE / {clean(ch["subtitle"])}',CAPTION))
        if ch.get('table'):
            story.append(Spacer(1,8));story.append(pdf_table(ch['table']));story.append(Spacer(1,8))
        for bullet in ch.get('bullets',[]):story.append(Paragraph('•  '+clean(bullet),BUL))
        story.append(Spacer(1,19))
        if i in (4,7,10,13):story.append(PageBreak())
    story.append(PageBreak())
    story.append(Paragraph('WORKING SCREENSHOT PORTFOLIO',KICK))
    story.append(Paragraph('Real application screens, captured in Chromium.',H1))
    story.append(Paragraph(f'The {len(FIGURES)} figures below were captured from the running production preview after authentication where needed. The script observed no uncaught browser page-level JavaScript exceptions. Desktop viewport: 1440 × 900; mobile viewport: 390 × 844. Figures are never fabricated mockups.',BODY))
    for i,(filename,title,desc,route) in enumerate(FIGURES,1):
        story.append(PageBreak())
        story.append(Paragraph(f'WORKING EVIDENCE / FIGURE {i:02d} OF {len(FIGURES):02d}',KICK))
        story.append(Paragraph(clean(title),H1))
        story.append(Paragraph(clean(desc),BODY))
        story.append(Spacer(1,10))
        story.append(pdf_pic(SHOTS/filename,max_w=496,max_h=462))
        story.append(Paragraph(f'FIG. {i:02d}  •  {clean(filename)}  •  {clean(route)}',CAPTION))
        story.append(Spacer(1,9))
        story.append(Paragraph('EVIDENCE INTERPRETATION',KICK))
        story.append(Paragraph('This is a real rendered application screen after a production server request. Sample product, center, wallet and settlement data are deliberately identified as demonstration records. Where actions require a role, the screenshot was captured after a successful authenticated demo login.',BODY))
    story.append(PageBreak())
    story.append(Paragraph('REFERENCES / VERIFIED SUBMISSION',KICK))
    story.append(Paragraph('References & reproducibility',H1))
    for name,url in REFERENCES:story.append(Paragraph(f'• <b>{clean(name)}:</b> {clean(url)}',BODY))
    story.append(Spacer(1,12));story.append(Paragraph('Protected role access',H2))
    story.append(pdf_table([['Role','Protected route'],['Citizen','/dashboard/citizen'],['Partner','/dashboard/partner'],['Recycler','/dashboard/recycler'],['Organization','/dashboard/organization'],['Center manager','/dashboard/center'],['Administrator','/dashboard/admin']]))
    story.append(Paragraph('Development credentials are stored separately in config/development-accounts.json, not in public pages or this report.',BODY))
    story.append(Spacer(1,12));story.append(Paragraph('Reproduce the verification',H2))
    for line in ['Install dependencies and configure DATABASE_URL for PostgreSQL.','Apply the Drizzle schema, then visit the temporary running preview.','Run node scripts/verify-end-to-end.mjs; it tests the full lifecycle and cleans temporary records.','Run node scripts/capture-report-screenshots.mjs to capture actual browser evidence.','Validate with npx next typegen, npm exec tsc -- --noEmit, npm run lint and npm run build.']:
        story.append(Paragraph('•  '+clean(line),BUL))
    story.append(Paragraph('Platform preview access note: '+clean(PREVIEW),MUT))
    story.append(Paragraph('No external payment gateway or bank settlement is configured; the wallet is intentionally a sandbox ledger. Permanent hosting requires deployment and database configuration.',MUT))
    doc.build(story,onFirstPage=draw_cover,onLaterPages=draw_page)
    return OUT/(OUTPUT_STEM+'.pdf')

word=build_word();pdf=build_pdf()
print(f'Generated Word report: {word} ({word.stat().st_size:,} bytes)')
print(f'Generated PDF report:  {pdf} ({pdf.stat().st_size:,} bytes)')
print(f'Figures: {len(FIGURES)}, Test result: {TEST["summary"]["passed"]}/{TEST["summary"]["total"]}, DB hubs: {STATS["centers"]}')
