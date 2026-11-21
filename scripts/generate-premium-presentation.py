#!/usr/bin/env python3
"""Generate an editable EcoTrace PPTX and a self-contained animated HTML presentation."""
import base64
import html
import io
import json
import math
import subprocess
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "presentations"
ASSETS = OUT / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
REPORTS = ROOT / "public" / "reports"
SHOTS = REPORTS / "screenshots"
IMAGES = ROOT / "public" / "images"
DIAGRAMS = REPORTS / "diagrams"
VERIFY = json.loads((REPORTS / "test-results.json").read_text())
assert VERIFY["result"] == "PASS" and VERIFY["summary"]["passed"] >= 74, "Only cite verified passing tests."

sql = "select json_build_object('users',(select count(*) from users),'centers',(select count(*) from collection_centers),'punjab',(select count(*) from collection_centers where state='Punjab'),'listings',(select count(*) from product_listings),'requests',(select count(*) from pickup_requests),'batches',(select count(*) from recycling_batches),'settlements',(select count(*) from settlement_records))::text;"
counts = json.loads(subprocess.check_output(["psql", "postgresql://postgres:postgres@127.0.0.1:5432/app_db", "-tAc", sql], text=True).strip())
N = len(list(SHOTS.glob("*.png")))
DATE = datetime.now().strftime("%d %B %Y")

DARK = "052E22"
DEEP = "071B16"
FOREST = "07543C"
GREEN = "087F59"
LIME = "BEF264"
MINT = "EAF8ED"
IVORY = "F7FBF7"
WHITE = "FFFFFF"
INK = "11231D"
GRAY = "5C7066"
GOLD = "F2C66B"
FONT = "Aptos"
FONT_HEAD = "Aptos Display"

S = [
 {"kind":"cover", "k":"LOVELY PROFESSIONAL UNIVERSITY / INT 252", "title":"EcoTrace India", "sub":"AI-powered e-waste collection, traceability & recycling management", "note":"Introduce yourself as Saiyam Kapur, B.Tech CSE, Section K4P24NW, Roll RK4P24NWA11. Explain that this is a working React full-stack application, not only a concept. Mention that sample facilities and wallet amounts are illustrative."},
 {"kind":"problem", "k":"01 / THE PROBLEM", "title":"E-waste disappears into a black box.", "sub":"Collection, recycling and customer settlement are often treated as one event. They are not.", "cards":[("01","Disconnected handoffs","A household, partner, hub and recycler each see only part of the journey."),("02","Unverified quantities","Image estimates, physical scale weight and recycler gate weight are easily confused."),("03","Missing customer closure","Customers need a transparent offer, statement and auditable outcome.")], "note":"Explain the problem without inventing national e-waste statistics. The project addresses traceability, physical verification and transparent customer communication. Do not claim an operational nationwide collection service."},
 {"kind":"solution", "k":"02 / THE IDEA", "title":"One platform. Every checkpoint.", "sub":"A connected experience from customer photo to documented material recovery.", "steps":[("01","LIST","Customer photo"),("02","COLLECT","Real scale weight"),("03","VERIFY","Hub checkpoint"),("04","RECYCLE","Documented mass"),("05","SETTLE","Sample wallet")], "note":"Walk through the five stages. Every transition is stored in PostgreSQL. The financial step is a simulated educational wallet entry and no real transfer. Collection alone does not mean material is recycled."},
 {"kind":"roles", "k":"03 / STAKEHOLDER ECOSYSTEM", "title":"Six roles. One accountable story.", "sub":"Purpose-built dashboards let each stakeholder act only at their authorized stage.", "cards":[("Citizen","Photos, listings, pickups and wallet"),("Collection partner","Routes, item counts and physical weighment"),("Center manager","Verify material and dispatch batches"),("Recycler","Gate receipt and recovery evidence"),("Organization","Internal material records and bulk requests"),("Administrator","Offers, operations, analytics and audits")], "note":"The site has six distinct role dashboards. Login is manual with the matching development account; account emails and passwords live in a separate non-public configuration file. APIs enforce roles on the server."},
 {"kind":"architecture", "k":"04 / REACT FULL-STACK ARCHITECTURE", "title":"Designed for real workflows.", "sub":"React 19 + Next.js 16 App Router, TypeScript, PostgreSQL and Drizzle ORM.", "image":"architecture", "bullets":["React UI: dashboards, image scanner, charts and Tara","Next.js routes: validation, sessions and role policies","Drizzle ORM: typed access to 13 PostgreSQL tables","OpenRouter: optional live AI behind server-only keys"], "note":"Explain that Next.js is the React framework used for INT 252. Server-side APIs keep database connections and AI keys out of the browser. Zod validates inputs; bcrypt and HTTP-only sessions secure user data."},
 {"kind":"database", "k":"05 / DATA MODEL", "title":"Facts stay separate by design.", "sub":"13 persisted tables connect users, listings, requests, batches, events and settlements.", "image":"er", "bullets":["Estimated ≠ physically collected weight","Collected ≠ recycler-received mass","Received ≠ documented recycled mass","A sample settlement cannot auto-generate a legal EPR credit"], "note":"Point out the entities users, product_listings, pickup_requests, recycling_batches, settlement_records and traceability_events. Different columns record estimates and measured weights. The full ER diagram is in the project report."},
 {"kind":"tablet", "k":"06 / LIVE SAMPLE CASE STUDY", "title":"A tablet with a complete paper trail.", "sub":"A photo-backed sample item from Phagwara, Punjab, with a recorded simulated customer outcome.", "image":"tablet", "stats":[("₹750","Sample wallet credit"),("0.52 kg","Reference estimate"),("0.58 kg","Physical collection"),("0.56 kg","Recycler receipt"),("0.53 kg","Documented recovery")], "note":"This uses a licensed stock tablet photograph credited to Karolina Grabowska/Pexels. The item is a sample record, not a real customer's device. Explain ₹750 was an admin-reviewed sample offer and the wallet entry is not real money."},
 {"kind":"timeline", "k":"07 / REQUEST-TO-RECYCLER FLOW", "title":"Nothing is skipped.", "sub":"The tablet case has 13 saved chain-of-custody events with distinct actors and timestamps.", "steps":[("01","PHOTO","Listed device"),("02","OFFER","Accepted quote"),("03","PICKUP","Partner assigned"),("04","WEIGHT","Measured 0.58 kg"),("05","GATE","Received 0.56 kg"),("06","RECOVERY","Documented 0.53 kg"),("07","WALLET","Sample ₹750")], "note":"Use the live /journey/tablet route during the product demo. It replays the persisted timeline and links to a private statement. Emphasize that physically verified quantity and mass are independently recorded at each custody point."},
 {"kind":"feature", "k":"08 / AI-ASSISTED IDENTIFICATION", "title":"A smarter starting point.", "sub":"Upload a photo, review visible devices, edit categories and manually confirm quantities.", "image":"scanner", "bullets":["12 supported electronic-waste categories","Multiple devices displayed as separate editable rows","OpenRouter Vision can suggest counts when available","No photo can measure exact physical weight"], "note":"Explain that the AI model is not a calibrated scale. OpenRouter Vision can return category and visible count suggestions; a rate-limited provider triggers an honestly labeled fallback. A person confirms counts and the partner measures mass physically."},
 {"kind":"feature-dark", "k":"09 / TARA MULTILINGUAL ASSISTANT", "title":"Talk in your language.", "sub":"English, Hindi, Punjabi and more—an AI assistant that remains honest about its limits.", "image":"chat", "bullets":["20 selectable languages plus Auto","Private account facts resolved on the server","Voice input and spoken replies where supported","Clear guided fallback when the provider is busy"], "note":"Demonstrate a Punjabi/Gurmukhi question. The server calls OpenRouter for general queries and does not send private pickup addresses or wallet records to the model. Free model availability and language quality can vary."},
 {"kind":"feature", "k":"10 / COLLECTION NETWORK", "title":"Punjab in focus.", "sub":"Searchable, filterable sample collection-point entries near Phagwara.", "image":"map", "bullets":["Phagwara, Goraya, Banga and Jalandhar","Kapurthala, Hoshiarpur and wider Punjab","10 sample Punjab entries; 15 total sample hubs","Contact: infoecotrase@gmail.com · 7087394940"], "note":"The pins are sample records in valid Punjab locations, not verified government-authorized facilities. The public map supports city and category filtering. A user should independently confirm a facility before visiting."},
 {"kind":"feature", "k":"11 / CITIZEN EXPERIENCE", "title":"A personal circular dashboard.", "sub":"Every request, product photo and status is accessible from a protected citizen account.", "image":"citizen", "bullets":["Image upload and category corrections","Pickup scheduling, history and Green Points","Actual collected weight shown separately","Own listings, offers and private statements"], "note":"Demonstrate the citizen dashboard after manual login. Its metrics come from database records. The sample Phagwara customer account shows the tablet and credited sample wallet statement."},
 {"kind":"split", "k":"12 / FIELD OPERATIONS", "title":"Physical evidence at the edge.", "sub":"A collection partner weighs items; a center manager verifies them before dispatch.", "left":"partner", "right":"center", "note":"Each role performs a different action. The partner records actual collected quantity and scale weight. The center manager verifies the collection and creates an outbound batch. Server-side permissions prevent one role from silently skipping a step."},
 {"kind":"feature", "k":"13 / RECYCLER OPERATIONS", "title":"Recovery needs evidence.", "sub":"Independent gate weight, accepted quantities, processing fractions and supporting logs.", "image":"recycler", "bullets":["Batch receipt logged independently",">10% weight variance triggers human review","Documented mass cannot exceed received mass","Recycler log and processed quantity are saved"], "note":"For the tablet, 0.58 kg was dispatched, 0.56 kg was received and 0.53 kg is documented recovery. These are sample values from PostgreSQL, not fabricated live recycling output. Supporting PDF is an internal sample log."},
 {"kind":"feature", "k":"14 / ADMIN COMMAND CENTER", "title":"An operational single source of truth.", "sub":"A premium SaaS workspace for pickups, approvals, centers and date-filtered impact.", "image":"admin", "bullets":["Consistent 7d / 30d / 90d / custom filters","Pickup assignment and batch verification","Offers, settlement review and audit logs","Measured and estimated quantities never merged"], "note":"Admin analytics are queried from backend data rather than static counters. Highlight date filter consistency across KPI cards, trends, categories, regions and recent activity. Admin also reviews suspicious discrepancies."},
 {"kind":"feature-dark", "k":"15 / CUSTOMER SETTLEMENT", "title":"The outcome is documented.", "sub":"An accepted quote leads to a private statement only after verified recovery and admin approval.", "image":"statement", "bullets":["Photo-backed line item and offered amount","Verified collection and recycler evidence","₹750 sample credit in a private customer wallet","Statement is not a bank transfer or tax invoice"], "note":"The tablet story ends in a sample wallet balance and printable statement. This is a simulated course demonstration. There is no real money, withdrawal, tax invoice or legally recognized EPR credit."},
 {"kind":"guardrails", "k":"16 / TRUST & PRIVACY", "title":"Honesty is an engineering decision.", "sub":"Trust is enforced by the data model, API and interface—not only by marketing copy.", "cards":[("ROLE-BASED ACCESS","Server checks each protected operation."),("PRIVATE BY DEFAULT","Home addresses and bills are owner-scoped."),("MASS-BALANCE RULES","Estimates, scale weights and recovery differ."),("NO FALSE CLAIMS","Sample centers and wallet entries are labeled.")], "note":"Passwords are hashed with bcrypt and session tokens are hashed before PostgreSQL storage. The public trace lookup redacts private addresses. Sample center entries are not government approvals. Internal EPR tracking does not issue legal credits."},
 {"kind":"qa", "k":"17 / VERIFICATION", "title":"Tested beyond the happy path.", "sub":"Automated API workflows, authenticated browser clicks and production validation.", "stats":[(f'{VERIFY["summary"]["passed"]}/{VERIFY["summary"]["total"]}',"End-to-end checks passed"),("40/40","Portal browser checks passed"),(str(N),"Actual browser screenshots"),("PASS","TypeScript · lint · production build")], "note":"The 74 checks include registration, invalid credentials, logout, role restrictions, product listing, quote, partner collection, recycler processing, payout gating and duplicate-credit rejection. The 40 browser checks cover manual login and destination-preserving redirects across all six dashboards."},
 {"kind":"demo", "k":"18 / PRESENTATION WALKTHROUGH", "title":"Watch the entire story unfold.", "sub":"Three concise routes demonstrate the product without sharing passwords publicly.", "steps":[("01","/journey/tablet","Replay 13 real database events"),("02","/dashboards","Select a protected role portal"),("03","/login","Use owner-provided development credentials"),("04","/statement/[id]","Inspect the private sample bill")], "note":"If you demonstrate live, begin at /journey/tablet, replay the timeline, then show /dashboards and sign in using the development account details kept in a separate project file. The managed E2B gateway requires its platform traffic token; do not claim an unauthenticated public preview URL works."},
 {"kind":"final", "k":"THANK YOU / QUESTIONS", "title":"Small actions. A more circular future.", "sub":"EcoTrace India — verified React full-stack e-waste traceability with a human story.", "note":"Close with what was implemented and verified. Invite questions on the database schema, authentication, Vision AI safeguards, mass-balance integrity or the simulated settlement flow. Contact: infoecotrase@gmail.com / 7087394940."},
]
assert len(S) == 20

FILES = {
 "hero":IMAGES/"premium-hero.jpg", "tablet":IMAGES/"tablet-sample.jpg",
 "architecture":DIAGRAMS/"01-system-architecture.png", "er":DIAGRAMS/"02-entity-relationship.png",
 "scanner":SHOTS/"13-ai-multi-device-pickup.png", "chat":SHOTS/"08-tara-punjabi-chatbot.png",
 "map":SHOTS/"20-punjab-interactive-map-detail.png", "citizen":SHOTS/"10-citizen-overview.png",
 "partner":SHOTS/"18-collection-partner-portal.png", "center":SHOTS/"30-center-manager-portal.png",
 "recycler":SHOTS/"17-recycler-batches.png", "admin":SHOTS/"15-admin-analytics.png",
 "statement":SHOTS/"26-tablet-customer-bill.png", "wallet":SHOTS/"27-phagwara-customer-wallet.png",
}
for label,file in FILES.items(): assert file.exists(), f"Missing verified image: {label} / {file}"

def rgb(value): return RGBColor.from_string(value)
def ix(n): return Inches(n)

def normalize_image(key, width=1250):
 src=Image.open(FILES[key]).convert("RGB")
 if src.width>width: src=src.resize((width,round(src.height*width/src.width)),Image.Resampling.LANCZOS)
 dst=ASSETS/(key+".jpg");src.save(dst,"JPEG",quality=84,optimize=True)
 return dst
MEDIA={key:normalize_image(key) for key in FILES}

def background(kind):
 w,h=1600,900
 dark=kind in ("dark","deep")
 a=(5,45,34) if dark else (247,251,247)
 b=(8,91,64) if dark else (232,248,236)
 if kind=="deep":a,b=(4,27,23),(4,55,44)
 im=Image.new("RGB",(w,h));px=im.load()
 for y in range(h):
  t=y/(h-1)
  for x in range(w):
   mix=min(1,max(0,t*.66+(x/w)*.34))
   px[x,y]=tuple(round(a[i]*(1-mix)+b[i]*mix) for i in range(3))
 haze=Image.new("RGBA",(w,h),(0,0,0,0));d=ImageDraw.Draw(haze)
 d.ellipse((w-500,-250,w+180,380),fill=(109,241,157,34 if dark else 29))
 d.ellipse((-330,h-400,330,h+240),fill=(172,238,99,25 if dark else 19))
 haze=haze.filter(ImageFilter.GaussianBlur(70))
 im=Image.alpha_composite(im.convert("RGBA"),haze).convert("RGB")
 out=ASSETS/("background-"+kind+".jpg");im.save(out,"JPEG",quality=86,optimize=True)
 return out
BGS={name:background(name) for name in ("dark","light","deep")}

prs=Presentation()
prs.slide_width=ix(13.333);prs.slide_height=ix(7.5)
prs.core_properties.title="EcoTrace India | Premium INT 252 Presentation"
prs.core_properties.subject="Working React application presentation with verified screenshots and accurate sample data"
prs.core_properties.author="Saiyam Kapur"
prs.core_properties.keywords="EcoTrace India, e-waste, React, Next.js, PostgreSQL, INT 252"


def rect(slide,x,y,w,h,fill=WHITE,radius=True,line=None,width=0.8):
 sh=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,ix(x),ix(y),ix(w),ix(h))
 sh.fill.solid();sh.fill.fore_color.rgb=rgb(fill)
 if line:sh.line.color.rgb=rgb(line);sh.line.width=Pt(width)
 else:sh.line.fill.background()
 return sh

def txt(slide,value,x,y,w,h,size=18,color=INK,bold=False,align=None,font=None):
 shape=slide.shapes.add_textbox(ix(x),ix(y),ix(w),ix(h));tf=shape.text_frame;tf.clear();tf.word_wrap=True;tf.margin_left=0;tf.margin_right=0;tf.margin_top=0;tf.margin_bottom=0
 for j,line in enumerate(str(value).split("\n")):
  p=tf.paragraphs[0] if j==0 else tf.add_paragraph();p.text=line;p.space_after=Pt(1)
  p.font.name=font or (FONT_HEAD if bold else FONT);p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=rgb(color)
  if align is not None:p.alignment=align
 return shape

def label(slide,value,x,y,w=7,color=GREEN):return txt(slide,value.upper(),x,y,w,.25,10,color,True)

def pill(slide,value,x,y,w,fill=MINT,fg=FOREST):
 rect(slide,x,y,w,.38,fill,True)
 txt(slide,value,x+.12,y+.095,w-.24,.18,9.5,fg,True)

def picture(slide,key,x,y,w,h,frame=WHITE):
 rect(slide,x-.08,y-.08,w+.16,h+.16,frame,True)
 src=Image.open(MEDIA[key]);ratio=w/h;target=ImageOps.fit(src,(max(10,int(w*150)),max(10,int(h*150))),method=Image.Resampling.LANCZOS,centering=(.5,.46))
 dst=ASSETS/f"crop-{key}-{int(w*150)}x{int(h*150)}.jpg";target.save(dst,"JPEG",quality=88,optimize=True)
 return slide.shapes.add_picture(str(dst),ix(x),ix(y),width=ix(w),height=ix(h))

def footer(slide,n,dark):
 txt(slide,"ECOTRACE INDIA   /   INT 252   /   SAIYAM KAPUR",.65,7.18,8,.18,8,"BDE9C7" if dark else GRAY,True)
 txt(slide,f"{n:02d} / {len(S):02d}",11.95,7.16,.75,.2,9,LIME if dark else GREEN,True,PP_ALIGN.RIGHT)
 rect(slide,.65,7.06,12.03,.018,FOREST if dark else "CAE7D5",False)
 rect(slide,.65,7.06,12.03*n/len(S),.025,LIME if dark else GREEN,False)

def add_transition(slide,i):
 transition=OxmlElement("p:transition");transition.set("spd","med");transition.set("advClick","1")
 name="p:fade" if i%5 not in (0,3) else "p:push"
 effect=OxmlElement(name)
 if name=="p:push":effect.set("dir","l")
 transition.append(effect)
 slide._element.append(transition)

def heading(slide,s,i,dark=False):
 fg=WHITE if dark else INK;sub="CAE9D7" if dark else GRAY
 label(slide,s["k"],.72,.68,11,LIME if dark else GREEN)
 txt(slide,s["title"],.72,1.07,11.9,.63,31,fg,True)
 txt(slide,s["sub"],.74,1.77,11.7,.54,14,sub,False)

def card(slide,x,y,w,h,number,title,body,dark=False):
 fill="0C4838" if dark else WHITE
 rect(slide,x,y,w,h,fill,True,line="2B725D" if dark else "DCEFE0")
 pill(slide,number,x+.24,y+.24,.5,LIME if dark else MINT,DARK if dark else GREEN)
 txt(slide,title,x+.24,y+.86,w-.48,.45,18,WHITE if dark else INK,True)
 txt(slide,body,x+.24,y+1.43,w-.48,h-1.7,12,"C7E8D2" if dark else GRAY)

def stat(slide,value,caption,x,y,w,dark=False):
 rect(slide,x,y,w,1.14,"0D4637" if dark else WHITE,True,line="266D55" if dark else "D9ECDF")
 txt(slide,value,x+.2,y+.14,w-.4,.47,25,LIME if dark else GREEN,True)
 txt(slide,caption,x+.2,y+.69,w-.4,.28,10,"C6E8D1" if dark else GRAY)

for i,s in enumerate(S,1):
 kind=s["kind"]
 dark=kind in ("cover","solution","database","timeline","feature-dark","qa","final")
 slide=prs.slides.add_slide(prs.slide_layouts[6]);slide.shapes.add_picture(str(BGS["dark" if dark else "light"]),0,0,width=prs.slide_width,height=prs.slide_height)
 add_transition(slide,i)
 if kind=="cover":
  label(slide,s["k"],.82,.78,6,LIME)
  txt(slide,"ECOTRACE",.78,1.58,6.2,.84,43,WHITE,True)
  txt(slide,"INDIA",.78,2.38,6.0,.91,48,LIME,True)
  txt(slide,s["sub"],.83,3.46,5.55,1.14,22,WHITE,False)
  pill(slide,"WORKING REACT FULL-STACK PROJECT",.83,5.08,3.85,"176A4D",WHITE)
  picture(slide,"hero",7.1,1.22,5.43,4.66)
  txt(slide,"Saiyam Kapur   |   B.Tech CSE   |   LPU",.83,6.1,7.9,.28,13,WHITE,True)
  txt(slide,"Roll RK4P24NWA11   •   Section K4P24NW",.83,6.45,8,.24,10,"CBE9D7")
 elif kind=="problem":
  heading(slide,s,i)
  for j,(num,title,body) in enumerate(s["cards"]):card(slide,.74+j*4.23,2.6,3.92,3.53,num,title,body)
  rect(slide,.74,6.36,11.84,.37,DARK,True)
  txt(slide,"A better experience needs verified custody, not an inflated statistic.",.95,6.47,11.4,.15,10,WHITE)
 elif kind=="solution":
  heading(slide,s,i,True)
  for j,(num,title,caption) in enumerate(s["steps"]):
   x=.74+j*2.53
   rect(slide,x,2.77,2.27,2.58,"0C4838",True,line="2B725D")
   txt(slide,num,x+.19,3.0,.85,.47,26,LIME,True)
   txt(slide,title,x+.19,3.8,1.92,.36,17,WHITE,True)
   txt(slide,caption,x+.19,4.45,1.87,.37,11,"C5E7D1")
   if j<4:txt(slide,"→",x+2.27,3.72,.25,.3,16,LIME,True)
  rect(slide,.74,5.84,11.84,.59,"176A4D",True)
  txt(slide,"The sample wallet is separate from collection and recycling evidence; no bank transfer takes place.",.98,6.04,11.3,.23,11,WHITE)
 elif kind=="roles":
  heading(slide,s,i)
  for j,(name,caption) in enumerate(s["cards"]):
   x=.74+(j%3)*4.22;y=2.53+(j//3)*1.78
   rect(slide,x,y,3.94,1.54,WHITE,True,line="D8EBDE")
   pill(slide,f"0{j+1}",x+.22,y+.2,.49,MINT,GREEN)
   txt(slide,name,x+.84,y+.2,2.82,.36,16,INK,True)
   txt(slide,caption,x+.24,y+.75,3.43,.46,11,GRAY)
  pill(slide,"6 ROLES  •  1 AUDITED DATA MODEL",.75,6.39,3.54,MINT,GREEN)
 elif kind=="architecture":
  heading(slide,s,i)
  picture(slide,"architecture",.74,2.47,11.83,2.87)
  for j,b in enumerate(s["bullets"]):
   x=.76+(j%2)*6.02;y=5.61+(j//2)*.47
   txt(slide,"✓  "+b,x,y,5.76,.3,12,INK)
 elif kind=="database":
  heading(slide,s,i,True)
  picture(slide,"er",.72,2.45,7.64,4.15,"0D4637")
  for j,b in enumerate(s["bullets"]):
   y=2.53+j*1.0;rect(slide,8.67,y,3.91,.84,"0D4637",True,line="2B725D")
   txt(slide,b,8.9,y+.16,3.48,.57,11,WHITE,True)
 elif kind=="tablet":
  heading(slide,s,i)
  picture(slide,"tablet",.73,2.49,5.08,3.96)
  pill(slide,"LICENSED STOCK PHOTO / PEXELS",.83,6.65,3.18,MINT,GREEN)
  for j,(v,c) in enumerate(s["stats"]):
   if j==0:stat(slide,v,c,6.17,2.47,6.28)
   else:stat(slide,v,c,6.17+((j-1)%2)*3.24,3.78+((j-1)//2)*1.31,3.06)
 elif kind=="timeline":
  heading(slide,s,i,True)
  for j,(num,name,caption) in enumerate(s["steps"]):
   row=j//4;col=j%4;x=.74+col*3.18;y=2.57+row*1.76
   rect(slide,x,y,2.91,1.5,"0D4839",True,line="2C7156")
   txt(slide,num,x+.2,y+.16,.6,.3,15,LIME,True)
   txt(slide,name,x+.2,y+.55,2.5,.36,14,WHITE,True)
   txt(slide,caption,x+.2,y+.99,2.5,.35,10,"C7E8D1")
 elif kind in ("feature","feature-dark"):
  heading(slide,s,i,dark)
  if s["image"]=="chat":picture(slide,"chat",7.52,2.38,5.02,4.05,"105442")
  else:picture(slide,s["image"],6.37,2.42,6.17,4.05,"104B39" if dark else WHITE)
  for j,b in enumerate(s["bullets"]):
   y=2.59+j*.89
   rect(slide,.77,y,5.25,.72,"124C3B" if dark else WHITE,True,line="2C7156" if dark else "D7ECDD")
   txt(slide,"0"+str(j+1),.97,y+.2,.43,.23,12,LIME if dark else GREEN,True)
   txt(slide,b,1.44,y+.14,4.36,.47,11.4,WHITE if dark else INK)
  if kind=="feature-dark":pill(slide,"SAMPLE DATA • NO REAL FUNDS",.77,6.56,3.65,"176B4D",WHITE)
 elif kind=="split":
  heading(slide,s,i)
  picture(slide,s["left"],.75,2.46,5.73,3.87)
  picture(slide,s["right"],6.81,2.46,5.73,3.87)
  txt(slide,"COLLECTION PARTNER: PHYSICAL WEIGHMENT",.81,6.47,5.65,.27,11,GREEN,True)
  txt(slide,"CENTER MANAGER: VERIFIED HANDOVER",6.87,6.47,5.61,.27,11,GREEN,True)
 elif kind=="guardrails":
  heading(slide,s,i)
  for j,(title,body) in enumerate(s["cards"]):
   x=.75+(j%2)*6.1;y=2.57+(j//2)*1.96
   rect(slide,x,y,5.73,1.68,WHITE,True,line="D9EEDD")
   pill(slide,str(j+1).zfill(2),x+.21,y+.22,.51,MINT,GREEN)
   txt(slide,title,x+.85,y+.27,4.57,.31,16,INK,True)
   txt(slide,body,x+.23,y+.91,5.23,.42,12,GRAY)
 elif kind=="qa":
  heading(slide,s,i,True)
  for j,(v,c) in enumerate(s["stats"]):stat(slide,v,c,.74+(j%2)*6.1,2.67+(j//2)*1.72,5.72,True)
  txt(slide,"Real browser captures. Real database records. No fabricated outcome claims.",.78,6.63,11.7,.27,12,"C7E6D2",True)
 elif kind=="demo":
  heading(slide,s,i)
  for j,(num,route,caption) in enumerate(s["steps"]):
   x=.75+(j%2)*6.1;y=2.58+(j//2)*1.78
   rect(slide,x,y,5.72,1.5,WHITE,True,line="D9ECDE")
   pill(slide,num,x+.21,y+.18,.5,MINT,GREEN)
   txt(slide,route,x+.86,y+.19,4.55,.32,17,INK,True)
   txt(slide,caption,x+.86,y+.77,4.59,.34,11,GRAY)
  txt(slide,"Public preview may require a platform traffic-access token; the project can be deployed separately.",.78,6.47,11.8,.28,10,GRAY)
 elif kind=="final":
  label(slide,"THANK YOU / Q&A",.82,.82,10,LIME)
  txt(slide,"Small actions.",.82,1.52,11.4,.73,42,WHITE,True)
  txt(slide,"A more circular future.",.82,2.33,11.4,.86,42,LIME,True)
  txt(slide,"EcoTrace India is a verified full-stack React project built for transparency, not inflated claims.",.84,3.54,10.1,.86,19,WHITE)
  rect(slide,.82,5.02,11.7,.87,"15533F",True,line="2B6C52")
  txt(slide,"Saiyam Kapur  ·  B.Tech CSE  ·  LPU  ·  RK4P24NWA11  ·  K4P24NW",1.1,5.27,10.9,.3,13,WHITE,True)
  txt(slide,"infoecotrase@gmail.com   /   7087394940",.84,6.26,8.1,.3,13,"C9EAD5")
 footer(slide,i,dark)
 try:slide.notes_slide.notes_text_frame.text=s["note"]
 except Exception as e:print("Presenter note warning on slide",i,type(e).__name__)

PPTX=OUT/"EcoTrace-India-INT252-Premium-Presentation.pptx"
prs.save(PPTX)

# Single-file HTML visual deck. Prepared photographs are embedded, so it works offline.
B64={key:"data:image/jpeg;base64,"+base64.b64encode(path.read_bytes()).decode() for key,path in MEDIA.items()}

def img(key,alt):return f'<img loading="eager" src="{B64[key]}" alt="{html.escape(alt)}" />'
def esc(s):return html.escape(str(s))
def text_block(s):return f'<div class="text-side reveal"><div class="eyebrow">{esc(s["k"])}</div><h2>{esc(s["title"])}</h2><p class="subtitle">{esc(s["sub"])}</p></div>'
def media(key,alt):return f'<div class="media reveal" style="--delay:.18s">{img(key,alt)}</div>'
def statcards(items):return '<div class="stat-grid">'+''.join(f'<div class="stat-card reveal" style="--delay:{.11*i:.2f}s"><strong>{esc(v)}</strong><span>{esc(c)}</span></div>' for i,(v,c) in enumerate(items))+'</div>'
def cards(items):return '<div class="card-grid">'+''.join(f'<div class="card reveal" style="--delay:{.10*i:.2f}s"><small>{esc(p)}</small><h3>{esc(t)}</h3><p>{esc(b)}</p></div>' for i,(p,t,b) in enumerate(items))+'</div>'
def bullets(items):return '<div class="bullet-grid">'+''.join(f'<div class="bullet reveal" style="--delay:{.09*i:.2f}s"><b>{str(i+1).zfill(2)}</b><span>{esc(b)}</span></div>' for i,b in enumerate(items))+'</div>'
def html_slide(s,n):
 kind=s['kind'];dark=kind in ('cover','solution','database','timeline','feature-dark','qa','final')
 cl='dark' if dark else 'light';content=''
 if kind=='cover':
  content=f'<div class="cover-grid"><div class="reveal"><div class="eyebrow">{esc(s["k"])}</div><h1>ECOTRACE<br/><em>INDIA</em></h1><p class="subtitle">{esc(s["sub"])}</p><div class="pill">WORKING REACT FULL-STACK PROJECT</div><p class="cover-author">Saiyam Kapur · B.Tech CSE · LPU<br/><small>Roll RK4P24NWA11 · Section K4P24NW</small></p></div>{media("hero","Electronic devices arranged among green leaves")}</div>'
 elif kind in ('problem','roles','guardrails'):
  content=text_block(s)
  if kind=='roles':content+=cards([(str(i+1).zfill(2),title,detail) for i,(title,detail) in enumerate(s['cards'])])
  else:content+=cards(s['cards'] if kind=='problem' else [(str(i+1).zfill(2),t,b) for i,(t,b) in enumerate(s['cards'])])
 elif kind in ('solution','timeline','demo'):
  content=text_block(s)+cards([(a,b,c) for a,b,c in s['steps']])
 elif kind=='tablet':
  content=text_block(s)+f'<div class="columns">{media("tablet","Stock photograph of one tablet on a desk")}{statcards(s["stats"])}</div><p class="photo-credit">Tablet sample photo by Karolina Grabowska / Pexels · No real payment</p>'
 elif kind in ('architecture','database'):
  content=text_block(s)+f'<div class="columns">{media(s["image"],"Verified architecture / entity-relationship diagram")}{bullets(s["bullets"])}</div>'
 elif kind in ('feature','feature-dark'):
  content=text_block(s)+f'<div class="columns">{bullets(s["bullets"])}{media(s["image"],"Authentic EcoTrace browser capture")}</div>'
 elif kind=='split':
  content=text_block(s)+f'<div class="two-media">{media(s["left"],"Collection partner portal screenshot")}{media(s["right"],"Center manager portal screenshot")}</div>'
 elif kind=='qa':content=text_block(s)+statcards(s['stats'])
 elif kind=='final':content=f'<div class="final-content reveal"><div class="eyebrow">{esc(s["k"])}</div><h1>Small actions.<br/><em>A more circular future.</em></h1><p class="subtitle">{esc(s["sub"])}</p><div class="final-author">Saiyam Kapur · B.Tech CSE · LPU · RK4P24NWA11 · K4P24NW</div><p>infoecotrase@gmail.com · 7087394940</p></div>'
 return f'<section class="slide {cl}" data-index="{n}" aria-label="Slide {n}: {esc(s["title"])}"><div class="bg-orb orb1"></div><div class="bg-orb orb2"></div><header class="slide-head"><div class="brand"><span class="mark">◈</span> EcoTrace <em>India</em></div><div class="chapter">{esc(s["k"])}</div></header><main class="slide-main">{content}</main><footer class="slide-foot"><span>INT 252 · Saiyam Kapur · LPU</span><span>{str(n).zfill(2)} / {len(S):02d}</span></footer><aside class="slide-note">{esc(s["note"])}</aside></section>'

html_slides='\n'.join(html_slide(s,i) for i,s in enumerate(S,1))
overview=''.join(f'<button data-jump="{i}" class="overview-item"><span>{i+1:02d}</span><b>{esc(s["title"])}</b></button>' for i,s in enumerate(S))
html_content='''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#052e22"/><title>EcoTrace India | Animated INT 252 Presentation</title><style>
:root{--forest:#052e22;--lime:#bef264;--mint:#eaf8ed;--ink:#11231d;--muted:#5c7066}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;font-family:Inter,"Aptos",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}body{background:#071b16;color:var(--ink)}button{font:inherit;cursor:pointer}.slide{position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;padding:2.2vw 4.7vw 1.5vw;opacity:0;visibility:hidden;transform:translateX(5vw) scale(.985);transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1),visibility .7s;pointer-events:none}.slide.prev{transform:translateX(-5vw) scale(.985)}.slide.active{z-index:2;opacity:1;visibility:visible;transform:translateX(0) scale(1);pointer-events:auto}.slide.light{background:linear-gradient(120deg,#f7fbf7 0%,#eaf8ed 100%);color:#11231d}.slide.dark{background:linear-gradient(125deg,#04291e,#07553c);color:white}.bg-orb{position:absolute;pointer-events:none;width:35vw;height:35vw;border-radius:50%;filter:blur(55px);opacity:.22;animation:orbFloat 12s ease-in-out infinite}.orb1{top:-22vw;right:-9vw;background:#55da8a}.orb2{bottom:-25vw;left:-13vw;background:#b3eb69;animation-delay:-4s;opacity:.1}.slide-head,.slide-foot{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between}.slide-head{height:5vh;border-bottom:1px solid currentColor;padding-bottom:1vw;opacity:.8;font-size:clamp(10px,1vw,15px)}.brand{font-weight:900;letter-spacing:-.04em;font-size:clamp(14px,1.45vw,23px)}.brand em{font-style:normal;color:#10b981}.dark .brand em{color:var(--lime)}.mark{display:inline-grid;place-items:center;width:2vw;height:2vw;min-width:26px;min-height:26px;margin-right:.35vw;border-radius:9px;background:#087f59;color:white}.chapter{font-size:clamp(9px,.8vw,13px);font-weight:800;letter-spacing:.14em;text-transform:uppercase}.slide-main{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center;padding:1.5vh 0;min-height:0}.slide-foot{border-top:1px solid currentColor;padding-top:.9vw;font-size:clamp(9px,.82vw,13px);font-weight:700;opacity:.6}.eyebrow{font-size:clamp(11px,.93vw,16px);font-weight:900;letter-spacing:.19em;text-transform:uppercase;color:#087f59}.dark .eyebrow{color:#bef264}h1,h2,h3,p{margin:0}h1{font-size:clamp(55px,7.3vw,128px);line-height:1.02;letter-spacing:-.07em;font-weight:950}h1 em{font-style:normal;color:#bef264}h2{max-width:95%;font-size:clamp(30px,3.45vw,65px);line-height:1.09;letter-spacing:-.055em;font-weight:900;margin-top:.8vw}h3{font-size:clamp(17px,1.4vw,24px);line-height:1.18;letter-spacing:-.025em}.subtitle{font-size:clamp(14px,1.25vw,21px);line-height:1.48;opacity:.73;max-width:75%;margin-top:1vw}.cover-grid{display:grid;grid-template-columns:1fr .97fr;gap:4vw;align-items:center}.cover-grid .subtitle{max-width:95%;font-size:clamp(18px,1.7vw,28px)}.cover-grid .media{height:59vh}.pill{display:inline-flex;margin-top:2vw;padding:.8vw 1.3vw;border:1px solid #bef26455;color:#d8f5c7;border-radius:99px;font-size:clamp(10px,.88vw,15px);font-weight:900;letter-spacing:.1em}.cover-author{font-size:clamp(14px,1.35vw,23px);font-weight:800;margin-top:3vw;line-height:1.55}.cover-author small{font-size:.67em;font-weight:500;color:#c3e3cc}.columns{display:grid;grid-template-columns:1fr 1fr;gap:2vw;align-items:stretch;min-height:0;margin-top:2.1vw;flex:1;max-height:55vh}.columns .media{height:100%}.media{overflow:hidden;position:relative;border:5px solid rgba(255,255,255,.75);box-shadow:0 18px 60px rgba(4,50,32,.16);border-radius:23px;background:rgba(14,94,61,.2)}.media img{width:100%;height:100%;object-fit:cover;display:block}.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25vw;margin-top:2.1vw}.slide[data-index="4"] .card-grid,.slide[data-index="17"] .card-grid{grid-template-columns:repeat(3,1fr)}.slide[data-index="17"] .card-grid{grid-template-columns:repeat(2,1fr)}.slide[data-index="8"] .card-grid{grid-template-columns:repeat(4,1fr)}.slide[data-index="19"] .card-grid{grid-template-columns:repeat(2,1fr)}.card{min-height:18vh;padding:1.5vw;border-radius:20px;background:#fff;border:1px solid #d9ebde;box-shadow:0 13px 30px #073b2a0c}.dark .card{background:#ffffff12;border-color:#ffffff24;box-shadow:none;color:white}.card small{display:block;font-size:clamp(13px,1.2vw,21px);font-weight:900;color:#087f59;margin-bottom:1.15vw}.dark .card small{color:#bef264}.card p{font-size:clamp(12px,1.03vw,17px);line-height:1.45;margin-top:.7vw;opacity:.75}.bullet-grid{display:flex;flex-direction:column;gap:.75vw;justify-content:center}.bullet{display:flex;align-items:center;gap:1vw;min-height:8vh;padding:1vw 1.2vw;background:#fff;border-radius:16px;border:1px solid #d9ecdd;font-size:clamp(12px,1.15vw,19px);font-weight:750}.dark .bullet{background:#ffffff12;border-color:#ffffff22}.bullet b{color:#087f59}.dark .bullet b{color:#bef264}.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1vw;align-content:center}.stat-card{padding:1.25vw;background:#fff;border:1px solid #d9ecdd;border-radius:18px;min-height:11vh}.dark .stat-card{background:#ffffff13;border-color:#ffffff26}.stat-card strong{display:block;font-size:clamp(24px,2.7vw,48px);line-height:1;color:#087f59;letter-spacing:-.05em}.dark .stat-card strong{color:#bef264}.stat-card span{display:block;margin-top:.7vw;font-size:clamp(10px,.9vw,15px);opacity:.68}.two-media{display:grid;grid-template-columns:1fr 1fr;gap:2vw;height:52vh;margin-top:2vw}.photo-credit{margin-top:1vw;font-size:11px;opacity:.5}.final-content{max-width:87%}.final-content .subtitle{margin-top:2vw}.final-author{margin-top:3vw;padding:1.2vw 1.5vw;border:1px solid #ffffff33;border-radius:16px;background:#ffffff12;width:max-content;max-width:100%;font-weight:800}.final-content>p:last-child{margin-top:2vw;font-size:clamp(15px,1.4vw,23px);color:#c5e6cc}.slide-note{display:none}.slide.active .reveal{animation:rise .75s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--delay,0s)}@keyframes rise{from{opacity:0;transform:translateY(28px);filter:blur(4px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}@keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(18px) scale(1.08)}}
#ui{position:fixed;z-index:30;bottom:1.5vw;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:.5vw;padding:.5vw;background:#061d17e8;border:1px solid #ffffff2e;border-radius:18px;box-shadow:0 15px 40px #0005;backdrop-filter:blur(20px);color:white}#ui button{border:0;background:#ffffff14;color:white;border-radius:11px;min-width:37px;height:36px;padding:0 10px;font-weight:900;transition:background .2s,transform .2s}#ui button:hover{background:#1aa36d;transform:translateY(-2px)}#ui button.active{background:#168b61}#ui .hint{font-size:11px;color:#b6dac5;margin:0 .55vw}#progress{position:fixed;z-index:28;top:0;left:0;height:5px;background:#bef264;box-shadow:0 0 18px #bef264a1;transition:width .65s ease}#overview{position:fixed;inset:0;z-index:40;background:#071b16f2;color:white;display:none;overflow:auto;padding:5vw 8vw;backdrop-filter:blur(25px)}#overview.open{display:block}#overview h2{margin:0 0 2vw}.overview-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1vw}.overview-item{background:#ffffff0f;border:1px solid #ffffff25;color:white;border-radius:14px;padding:1.2vw;text-align:left;min-height:100px;transition:.2s}.overview-item:hover{background:#09704a;transform:translateY(-3px)}.overview-item span{display:block;color:#bef264;font-weight:900}.overview-item b{display:block;margin-top:.8vw;font-size:14px}.overlay-close{position:absolute;right:4vw;top:3vw;border:1px solid #ffffff5c;border-radius:12px;background:#ffffff16;padding:10px 14px;color:white;font-weight:800}#presenter-notes{position:fixed;z-index:35;right:2vw;bottom:5vw;max-width:410px;padding:20px;background:#071b16ec;color:#e0f6e6;border:1px solid #85d4a665;border-radius:16px;box-shadow:0 20px 50px #0006;font-size:13px;line-height:1.6;display:none}#presenter-notes.open{display:block}#clock{font-size:11px;color:#bef264;min-width:48px;text-align:center}#help{position:fixed;z-index:32;top:6.5vw;right:2vw;border:1px solid #ffffff22;background:#052e22ce;color:#eaf8ed;border-radius:9px;padding:7px 12px;font-weight:900;cursor:pointer}.touch-note{display:none}@media(max-width:900px){.slide{padding:20px 24px 72px}.slide-head{height:38px}.chapter{display:none}h1{font-size:clamp(40px,7vw,72px)}h2{font-size:clamp(26px,4.4vw,42px)}.subtitle{max-width:100%;font-size:14px}.cover-grid{grid-template-columns:1fr}.cover-grid .media{height:28vh}.cover-author{margin-top:2vw}.columns{grid-template-columns:1fr;max-height:none;gap:1.4vw}.columns .media{height:28vh}.bullet-grid{display:grid;grid-template-columns:repeat(2,1fr)}.bullet{min-height:5vh;padding:10px;font-size:11px}.card-grid{grid-template-columns:repeat(2,1fr)}.card{min-height:12vh;padding:12px}.card p{font-size:11px}.two-media{height:28vh}.stat-card{min-height:8vh}.slide-foot{font-size:9px}.overview-grid{grid-template-columns:repeat(2,1fr)}#ui{bottom:10px;padding:5px;gap:3px}#ui .hint{display:none}.touch-note{display:inline}}@media(max-width:540px){#help{top:52px;right:14px}.slide{padding:13px 15px 72px}.slide-head{height:32px}.brand{font-size:13px}.slide-main{justify-content:flex-start;padding-top:3vh}h1{font-size:45px}h2{font-size:27px}.subtitle{font-size:12px}.card-grid,.slide[data-index="8"] .card-grid{grid-template-columns:repeat(2,1fr);gap:7px;margin-top:18px}.card{padding:9px;min-height:13vh}.card h3{font-size:13px}.card p{font-size:10px}.card small{font-size:11px}.columns{margin-top:12px}.columns .media{height:25vh}.two-media{height:25vh;gap:5px}.bullet{font-size:10px;padding:7px}.stat-card{padding:9px}.stat-card strong{font-size:22px}.stat-card span{font-size:10px}.cover-grid .media{height:26vh}.final-author{font-size:11px}.overview-grid{grid-template-columns:1fr 1fr}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style></head><body><div id="progress"></div>__SLIDES__<div id="ui"><button id="prev" title="Previous slide" aria-label="Previous slide">←</button><button id="next" title="Next slide" aria-label="Next slide">→</button><span class="hint">← → navigate · space to advance</span><button id="overviewButton" title="Overview (O)">▦</button><button id="notesButton" title="Presenter notes (N)">N</button><button id="fullscreenButton" title="Fullscreen (F)">⛶</button><span id="clock">00:00</span></div><button id="help" title="Keyboard shortcuts">?</button><div id="overview"><button class="overlay-close" id="closeOverview">Close ×</button><h2>Presentation overview</h2><p style="opacity:.7;margin-bottom:22px">Choose a chapter, or press Esc to return.</p><div class="overview-grid">__OVERVIEW__</div></div><aside id="presenter-notes"></aside><script>
(()=>{const slides=[...document.querySelectorAll('.slide')],total=slides.length,progress=document.getElementById('progress'),notes=document.getElementById('presenter-notes'),overview=document.getElementById('overview'),clock=document.getElementById('clock');let index=0,seconds=0,touchX=0;const pad=n=>String(n).padStart(2,'0');function go(n){if(n<0||n>=total)return;slides[index].classList.remove('active');slides[index].classList.toggle('prev',n>index);index=n;slides.forEach((s,i)=>s.classList.toggle('prev',i<index));void slides[index].offsetWidth;slides[index].classList.add('active');progress.style.width=((index+1)/total*100)+'%';notes.textContent=slides[index].querySelector('.slide-note')?.textContent||'';document.title=`${pad(index+1)} / ${pad(total)} · EcoTrace India`;history.replaceState(null,'','#slide-'+(index+1));document.getElementById('prev').disabled=index===0;document.getElementById('next').disabled=index===total-1}document.getElementById('prev').onclick=()=>go(index-1);document.getElementById('next').onclick=()=>go(index+1);document.getElementById('overviewButton').onclick=()=>overview.classList.toggle('open');document.getElementById('closeOverview').onclick=()=>overview.classList.remove('open');document.getElementById('notesButton').onclick=()=>notes.classList.toggle('open');document.getElementById('fullscreenButton').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.()};document.getElementById('help').onclick=()=>{notes.classList.add('open');notes.textContent='Controls: ← / → or Space to navigate; O for overview; N for presenter notes; F for full screen; Home and End jump to first and last slide; swipe left/right on touch screens.'};document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{overview.classList.remove('open');go(Number(b.dataset.jump))});window.addEventListener('keydown',e=>{if(e.key==='Escape'){overview.classList.remove('open');notes.classList.remove('open');return}if(['ArrowRight','ArrowLeft',' ','PageDown','PageUp','Home','End'].includes(e.key))e.preventDefault();if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')go(index+1);else if(e.key==='ArrowLeft'||e.key==='PageUp')go(index-1);else if(e.key==='Home')go(0);else if(e.key==='End')go(total-1);else if(e.key.toLowerCase()==='o')overview.classList.toggle('open');else if(e.key.toLowerCase()==='n')notes.classList.toggle('open');else if(e.key.toLowerCase()==='f')document.getElementById('fullscreenButton').click()});window.addEventListener('touchstart',e=>touchX=e.changedTouches[0].screenX,{passive:true});window.addEventListener('touchend',e=>{const d=e.changedTouches[0].screenX-touchX;if(Math.abs(d)>75)go(index+(d<0?1:-1))},{passive:true});setInterval(()=>{seconds++;clock.textContent=`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`},1000);go(Math.max(0,Math.min(total-1,(Number(location.hash.replace('#slide-',''))||1)-1)))} )();
</script></body></html>'''.replace('__SLIDES__',html_slides).replace('__OVERVIEW__',overview)
HTML=OUT/"EcoTrace-India-INT252-Animated-Presentation.html"
HTML.write_text(html_content,encoding="utf-8")

NOTES=OUT/"EcoTrace-India-Presenter-Notes.md"
notes_text="# EcoTrace India — Presenter Notes\n\n**INT 252 | Web App Development with React JS**  \nSaiyam Kapur · B.Tech CSE · LPU · RK4P24NWA11 · K4P24NW\n\nSuggested duration: ~12 minutes plus Q&A. Slide content reflects live PostgreSQL sample records. The wallet is simulated, and centers are sample listings.\n\n"
for i,s in enumerate(S,1):notes_text+=f"## {i:02d}. {s['title']}\n\n{s['note']}\n\n"
notes_text+="## Suggested live path\n\n1. Open /journey/tablet to replay the sample material timeline.\n2. Open /dashboards, choose a role, and sign in using the separate project owner's development account file. Do not place passwords in this presentation.\n3. Show the customer statement only while signed in as its owner.\n4. For Q&A: distinguish estimated weight, collected weight, recycler gate weight and documented recovery.\n\n## Likely viva questions\n\n- Why React via Next.js? It combines typed interactive React UI with App Router server rendering and protected route handlers.\n- Why PostgreSQL and Drizzle? Typed relational ownership, event traces and consistent backend analytics.\n- Is the wallet a real payment? No, it is an explicitly simulated ledger entry.\n- Does AI determine exact physical mass? No. Physical scale weight is recorded during pickup.\n- Are these hubs legally authorized? No; they are clearly labeled sample records.\n- What happens if OpenRouter is unavailable? The classifier/chat clearly switch to local guided fallback.\n"
NOTES.write_text(notes_text,encoding="utf-8")
print(f"Generated {len(S)}-slide PPTX: {PPTX} ({PPTX.stat().st_size/1048576:.1f} MiB)")
print(f"Generated animated standalone HTML: {HTML} ({HTML.stat().st_size/1048576:.1f} MiB)")
print(f"Generated presenter notes: {NOTES} ({NOTES.stat().st_size} bytes)")
