import * as XLSX from "xlsx";
import path from "path";

// 1. Prepare Main Submission Data (Matching the exact columns from the template)
const mainData = [
  {
    "Project Title": "EcoTrace India — AI-Powered Circular E-Waste Traceability & Recycling Platform",
    "Team Name": "Aetheris Innovations",
    "Course Code": "INT 257",
    "Registration Number(s) of All Team Members": "12404781, 12404118, 12403968",
    "GitHub Repository Link": "https://github.com/SaiyamKapur/ecotrace-india",
    "Deployed Project Link": "https://ecotrace-india-two.vercel.app",
    "Contribution in Project":
      "Saiyam Kapur (12404781): Full-Stack Architecture, Next.js 16 App Router Frontend, Responsive UI/UX Design System, Interactive Maps, Cloud Deployment & Vercel CI/CD Pipeline.\n\n" +
      "Aarju Yadav (12404118): Neon PostgreSQL Database Modeling with Drizzle ORM, Serverless Backend REST APIs, Session Authentication & AI Vision Classification with Tara Multilingual Assistant.\n\n" +
      "Shilpi Raj (12403968): 6 Role-Based Portals (Admin, Recycler, Citizen, Organization, Partner, Center), EPR Compliance Engine, Financial Statements, Audit Logging & Playwright E2E Testing."
  }
];

// 2. Prepare Detailed Team Breakdown Sheet
const teamBreakdownData = [
  {
    "Member Name": "Saiyam Kapur",
    "Registration No.": "12404781",
    "Course Code": "INT 257",
    "Assigned Act": "Act 1 — Frontend & Architecture",
    "Key Contributions":
      "• Next.js 16 full-stack architecture with Webpack optimization\n" +
      "• High-resolution verified UI/UX & responsive design system\n" +
      "• Collection centers discovery with interactive geolocation maps\n" +
      "• Vercel production deployment and automated GitHub CI/CD pipeline",
    "GitHub Repo": "https://github.com/SaiyamKapur/ecotrace-india",
    "Live Deployment": "https://ecotrace-india-two.vercel.app"
  },
  {
    "Member Name": "Aarju Yadav",
    "Registration No.": "12404118",
    "Course Code": "INT 257",
    "Assigned Act": "Act 2 — Backend, Data & AI",
    "Key Contributions":
      "• Neon Serverless PostgreSQL database schema design with Drizzle ORM\n" +
      "• Serverless REST API endpoints for pickups, batches, payouts, and EPR records\n" +
      "• Session-based secure credential authentication and role authorization\n" +
      "• AI-assisted e-waste item classifier and 7-language Tara assistant engine",
    "GitHub Repo": "https://github.com/SaiyamKapur/ecotrace-india",
    "Live Deployment": "https://ecotrace-india-two.vercel.app"
  },
  {
    "Member Name": "Shilpi Raj",
    "Registration No.": "12403968",
    "Course Code": "INT 257",
    "Assigned Act": "Act 3 — Portals, Operations & Testing",
    "Key Contributions":
      "• 6 dedicated role portals (Citizen, Partner Driver, Recycler, Organization, Center Manager, Admin)\n" +
      "• EPR regulatory compliance reporting and recovery certificate generation\n" +
      "• System audit logging and verified marketplace settlement workflows\n" +
      "• Comprehensive automated testing suite with 74/74 unit tests and 40/40 Playwright browser tests",
    "GitHub Repo": "https://github.com/SaiyamKapur/ecotrace-india",
    "Live Deployment": "https://ecotrace-india-two.vercel.app"
  }
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Add Sheet 1: Project Submission
const wsMain = XLSX.utils.json_to_sheet(mainData);
wsMain["!cols"] = [
  { wch: 35 }, // Project Title
  { wch: 22 }, // Team Name
  { wch: 14 }, // Course Code
  { wch: 32 }, // Registration Numbers
  { wch: 45 }, // GitHub Repo
  { wch: 40 }, // Deployed Link
  { wch: 80 }  // Contribution
];
XLSX.utils.book_append_sheet(workbook, wsMain, "Project Submission");

// Add Sheet 2: Detailed Team Breakdown
const wsTeam = XLSX.utils.json_to_sheet(teamBreakdownData);
wsTeam["!cols"] = [
  { wch: 18 }, // Member Name
  { wch: 18 }, // Reg No
  { wch: 14 }, // Course Code
  { wch: 32 }, // Assigned Act
  { wch: 75 }, // Key Contributions
  { wch: 45 }, // GitHub
  { wch: 40 }  // Live Deployment
];
XLSX.utils.book_append_sheet(workbook, wsTeam, "Team Breakdown");

// Save to root directory
const outputPath = path.resolve("INT257-Project-Submission-Details.xlsx");
XLSX.writeFile(workbook, outputPath);
console.log("Excel file successfully created at:", outputPath);
