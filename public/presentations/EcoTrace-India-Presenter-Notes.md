# EcoTrace India — Presenter Notes

**INT 252 | Web App Development with React JS**  
Saiyam Kapur · B.Tech CSE · LPU · RK4P24NWA11 · K4P24NW

Suggested duration: ~12 minutes plus Q&A. Slide content reflects live PostgreSQL sample records. The wallet is simulated, and centers are sample listings.

## 01. EcoTrace India

Introduce yourself as Saiyam Kapur, B.Tech CSE, Section K4P24NW, Roll RK4P24NWA11. Explain that this is a working React full-stack application, not only a concept. Mention that sample facilities and wallet amounts are illustrative.

## 02. E-waste disappears into a black box.

Explain the problem without inventing national e-waste statistics. The project addresses traceability, physical verification and transparent customer communication. Do not claim an operational nationwide collection service.

## 03. One platform. Every checkpoint.

Walk through the five stages. Every transition is stored in PostgreSQL. The financial step is a simulated educational wallet entry and no real transfer. Collection alone does not mean material is recycled.

## 04. Six roles. One accountable story.

The site has six distinct role dashboards. Login is manual with the matching development account; account emails and passwords live in a separate non-public configuration file. APIs enforce roles on the server.

## 05. Designed for real workflows.

Explain that Next.js is the React framework used for INT 252. Server-side APIs keep database connections and AI keys out of the browser. Zod validates inputs; bcrypt and HTTP-only sessions secure user data.

## 06. Facts stay separate by design.

Point out the entities users, product_listings, pickup_requests, recycling_batches, settlement_records and traceability_events. Different columns record estimates and measured weights. The full ER diagram is in the project report.

## 07. A tablet with a complete paper trail.

This uses a licensed stock tablet photograph credited to Karolina Grabowska/Pexels. The item is a sample record, not a real customer's device. Explain ₹750 was an admin-reviewed sample offer and the wallet entry is not real money.

## 08. Nothing is skipped.

Use the live /journey/tablet route during the product demo. It replays the persisted timeline and links to a private statement. Emphasize that physically verified quantity and mass are independently recorded at each custody point.

## 09. A smarter starting point.

Explain that the AI model is not a calibrated scale. OpenRouter Vision can return category and visible count suggestions; a rate-limited provider triggers an honestly labeled fallback. A person confirms counts and the partner measures mass physically.

## 10. Talk in your language.

Demonstrate a Punjabi/Gurmukhi question. The server calls OpenRouter for general queries and does not send private pickup addresses or wallet records to the model. Free model availability and language quality can vary.

## 11. Punjab in focus.

The pins are sample records in valid Punjab locations, not verified government-authorized facilities. The public map supports city and category filtering. A user should independently confirm a facility before visiting.

## 12. A personal circular dashboard.

Demonstrate the citizen dashboard after manual login. Its metrics come from database records. The sample Phagwara customer account shows the tablet and credited sample wallet statement.

## 13. Physical evidence at the edge.

Each role performs a different action. The partner records actual collected quantity and scale weight. The center manager verifies the collection and creates an outbound batch. Server-side permissions prevent one role from silently skipping a step.

## 14. Recovery needs evidence.

For the tablet, 0.58 kg was dispatched, 0.56 kg was received and 0.53 kg is documented recovery. These are sample values from PostgreSQL, not fabricated live recycling output. Supporting PDF is an internal sample log.

## 15. An operational single source of truth.

Admin analytics are queried from backend data rather than static counters. Highlight date filter consistency across KPI cards, trends, categories, regions and recent activity. Admin also reviews suspicious discrepancies.

## 16. The outcome is documented.

The tablet story ends in a sample wallet balance and printable statement. This is a simulated course demonstration. There is no real money, withdrawal, tax invoice or legally recognized EPR credit.

## 17. Honesty is an engineering decision.

Passwords are hashed with bcrypt and session tokens are hashed before PostgreSQL storage. The public trace lookup redacts private addresses. Sample center entries are not government approvals. Internal EPR tracking does not issue legal credits.

## 18. Tested beyond the happy path.

The 74 checks include registration, invalid credentials, logout, role restrictions, product listing, quote, partner collection, recycler processing, payout gating and duplicate-credit rejection. The 40 browser checks cover manual login and destination-preserving redirects across all six dashboards.

## 19. Watch the entire story unfold.

If you demonstrate live, begin at /journey/tablet, replay the timeline, then show /dashboards and sign in using the development account details kept in a separate project file. The managed E2B gateway requires its platform traffic token; do not claim an unauthenticated public preview URL works.

## 20. Small actions. A more circular future.

Close with what was implemented and verified. Invite questions on the database schema, authentication, Vision AI safeguards, mass-balance integrity or the simulated settlement flow. Contact: infoecotrase@gmail.com / 7087394940.

## Suggested live path

1. Open /journey/tablet to replay the sample material timeline.
2. Open /dashboards, choose a role, and sign in using the separate project owner's development account file. Do not place passwords in this presentation.
3. Show the customer statement only while signed in as its owner.
4. For Q&A: distinguish estimated weight, collected weight, recycler gate weight and documented recovery.

## Likely viva questions

- Why React via Next.js? It combines typed interactive React UI with App Router server rendering and protected route handlers.
- Why PostgreSQL and Drizzle? Typed relational ownership, event traces and consistent backend analytics.
- Is the wallet a real payment? No, it is an explicitly simulated ledger entry.
- Does AI determine exact physical mass? No. Physical scale weight is recorded during pickup.
- Are these hubs legally authorized? No; they are clearly labeled sample records.
- What happens if OpenRouter is unavailable? The classifier/chat clearly switch to local guided fallback.
