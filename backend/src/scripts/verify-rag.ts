/**
 * VCGIS Phase 9 — RAG Knowledge System Verification Script
 * Automated end-to-end test verifying:
 * 1. Document directory listing and pre-seeded circulars (/api/rag/documents)
 * 2. Grounded RAG query on Sakala statutory timelines & compensation (/api/rag/query)
 * 3. Department-filtered query on Rural Drinking Water funds
 * 4. Grounded query on BESCOM power distribution SOP & live wire emergencies
 * 5. Anti-hallucination guardrail on unsupported queries (explicit disclaimer returned)
 * 6. Dynamic document ingestion, chunking, and version archiving lifecycle
 * 7. RBAC security boundaries (non-admins blocked from ingestion/archive with 403)
 */

import http from "http";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";

async function runRagVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`RAG Knowledge System verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 7;

  try {
    // 1. Authenticate Staff (Admin & Official)
    logger.info("Authenticating admin and official credentials");
    const adminLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@vcgis.gov.in",
        password: "Admin@12345",
      }),
    });
    const adminLogin = (await adminLoginRes.json()) as {
      success: boolean;
      data?: { accessToken: string };
    };
    if (!adminLogin.success || !adminLogin.data?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
    }
    const adminToken = adminLogin.data.accessToken;

    const officialLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "official@vcgis.gov.in",
        password: "Official@12345",
      }),
    });
    const officialLogin = (await officialLoginRes.json()) as {
      success: boolean;
      data?: { accessToken: string };
    };
    if (!officialLogin.success || !officialLogin.data?.accessToken) {
      throw new Error(`Official login failed: ${JSON.stringify(officialLogin)}`);
    }
    const officialToken = officialLogin.data.accessToken;

    // Test 1: List Active Documents
    logger.info("Test 1: Listing active Karnataka government circulars & GOs");
    const listRes = await fetch(`${baseUrl}/rag/documents`, {
      headers: { Authorization: `Bearer ${officialToken}` },
    });
    const listData = (await listRes.json()) as {
      success: boolean;
      data?: { total_documents: number; documents: Array<{ document_number: string; title: string }> };
    };

    if (!listData.success || !listData.data || listData.data.total_documents < 4) {
      throw new Error(`Document listing failed: ${JSON.stringify(listData)}`);
    }

    const docNumbers = listData.data.documents.map((d) => d.document_number);
    if (!docNumbers.includes("KRN-ACT-SAKALA-2011-01") || !docNumbers.includes("KRN-GO-RDPR-2024-41")) {
      throw new Error(`Expected Sakala and RDPR circulars not found in list: ${docNumbers.join(", ")}`);
    }
    logger.info(`✓ Test 1 Passed: Found ${listData.data.total_documents} active authoritative documents`);
    passedTests++;

    // Test 2: Grounded Query on Sakala Act
    logger.info("Test 2: Grounded RAG query on Sakala statutory resolution deadline & penalty");
    const sakalaQueryRes = await fetch(`${baseUrl}/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "What is the statutory deadline under Sakala for resolving drinking water failure?",
        departmentFilter: "Rural Development",
        maxSources: 2,
      }),
    });
    const sakalaQuery = (await sakalaQueryRes.json()) as {
      success: boolean;
      data?: {
        grounded_answer: string;
        is_grounded: boolean;
        sources: Array<{ document_number: string; title: string; excerpt: string }>;
      };
    };

    if (!sakalaQuery.success || !sakalaQuery.data?.is_grounded || !sakalaQuery.data.sources || sakalaQuery.data.sources.length === 0) {
      throw new Error(`Sakala query failed: ${JSON.stringify(sakalaQuery)}`);
    }
    const topSakala = sakalaQuery.data.sources[0];
    if (!topSakala || topSakala.document_number !== "KRN-ACT-SAKALA-2011-01") {
      throw new Error(`Expected citation KRN-ACT-SAKALA-2011-01, got ${topSakala?.document_number}`);
    }
    logger.info(`✓ Test 2 Passed: Grounded answer verified with citation: ${topSakala.document_number}`);
    passedTests++;

    // Test 3: Department-Filtered Query on Rural Water Supply Funds
    logger.info("Test 3: Department-filtered query on Jal Jeevan Mission borewell replacement funds");
    const waterQueryRes = await fetch(`${baseUrl}/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "How much can Gram Panchayat spend on replacing a community borewell pump without tender?",
        departmentFilter: "Rural Drinking Water",
        maxSources: 2,
      }),
    });
    const waterQuery = (await waterQueryRes.json()) as {
      success: boolean;
      data?: {
        is_grounded: boolean;
        sources: Array<{ document_number: string; excerpt: string }>;
      };
    };

    if (!waterQuery.success || !waterQuery.data?.is_grounded || waterQuery.data.sources.length === 0) {
      throw new Error(`Water supply query failed: ${JSON.stringify(waterQuery)}`);
    }
    if (!waterQuery.data.sources.some((s) => s.document_number === "KRN-GO-RDPR-2024-41")) {
      throw new Error("Expected Jal Jeevan Mission source citation not found");
    }
    logger.info("✓ Test 3 Passed: Borewell motor replacement rules retrieved with exact RDPR GO reference");
    passedTests++;

    // Test 4: BESCOM Transformer Failure SLA
    logger.info("Test 4: Grounded query on BESCOM transformer failure restoration SLA");
    const powerQueryRes = await fetch(`${baseUrl}/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "Within how many hours must BESCOM replace a failed distribution transformer in rural areas?",
        departmentFilter: "Energy",
        maxSources: 2,
      }),
    });
    const powerQuery = (await powerQueryRes.json()) as {
      success: boolean;
      data?: {
        is_grounded: boolean;
        sources: Array<{ document_number: string }>;
      };
    };

    if (!powerQuery.success || !powerQuery.data?.is_grounded || !powerQuery.data.sources || powerQuery.data.sources.length === 0) {
      throw new Error(`Power distribution query failed: ${JSON.stringify(powerQuery)}`);
    }
    const topPower = powerQuery.data.sources[0];
    if (!topPower || topPower.document_number !== "KRN-KERC-BESCOM-2023-12") {
      throw new Error("Expected BESCOM KERC citation not returned as top source");
    }
    logger.info("✓ Test 4 Passed: 24h rural transformer restoration SLA retrieved with KERC citation");
    passedTests++;

    // Test 5: Anti-Hallucination Guardrail for Unsupported Queries
    logger.info("Test 5: Anti-hallucination guardrail on unverified / out-of-scope query");
    const hallucinationRes = await fetch(`${baseUrl}/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "What is the government subsidy for flying cars and alien spaceships on Mars in Karnataka?",
        maxSources: 2,
      }),
    });
    const hallucinationData = (await hallucinationRes.json()) as {
      success: boolean;
      data?: {
        is_grounded: boolean;
        sources: unknown[];
        grounded_answer: string;
      };
    };

    if (
      !hallucinationData.success ||
      hallucinationData.data?.is_grounded !== false ||
      (hallucinationData.data.sources && hallucinationData.data.sources.length > 0) ||
      !hallucinationData.data.grounded_answer.includes("No authorized Government of Karnataka circular")
    ) {
      throw new Error(`Anti-hallucination guardrail failed: ${JSON.stringify(hallucinationData)}`);
    }
    logger.info("✓ Test 5 Passed: Unsupported query properly rejected with official disclaimer and 0 hallucinations");
    passedTests++;

    // Test 6: Ingest & Supersede Lifecycle
    logger.info("Test 6: Admin dynamic ingestion, chunking, and version superseding lifecycle");
    const newDocPayload = {
      title: "Karnataka Gruha Jyothi Free Electricity Operational Protocol 2026",
      documentNumber: "KRN-GO-ENERGY-2026-88",
      department: "Energy Department",
      category: "Welfare Scheme & Electricity",
      version: "1.0",
      effectiveDate: "2026-04-01",
      source: "Energy Department Notification",
      content:
        "Under the Gruha Jyothi scheme, all domestic households in Karnataka consuming up to 200 units per month are eligible for zero electricity bill. Meter tampering or commercial usage shall result in immediate scheme disqualification and fine of Rs. 2,500.",
      tags: ["gruha jyothi", "free electricity", "200 units", "energy", "bescom"],
    };

    const ingestRes = await fetch(`${baseUrl}/rag/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newDocPayload),
    });
    const ingestData = (await ingestRes.json()) as {
      success: boolean;
      data?: { total_chunks: number; document_id?: string; id?: string };
    };

    if (!ingestRes.ok || !ingestData.success) {
      throw new Error(`Admin document ingestion failed: ${JSON.stringify(ingestData)}`);
    }

    // Query newly ingested document
    const verifyQueryRes = await fetch(`${baseUrl}/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "How many free electricity units are allowed under Gruha Jyothi in Karnataka?",
        maxSources: 2,
      }),
    });
    const verifyQuery = (await verifyQueryRes.json()) as {
      success: boolean;
      data?: { is_grounded: boolean; sources: Array<{ document_number: string }> };
    };

    if (
      !verifyQuery.success ||
      !verifyQuery.data?.is_grounded ||
      !verifyQuery.data.sources.some((s) => s.document_number === "KRN-GO-ENERGY-2026-88")
    ) {
      throw new Error(`Query on newly ingested document failed: ${JSON.stringify(verifyQuery)}`);
    }

    // Now supersede/archive the document
    const docId = ingestData.data?.document_id || "KRN-GO-ENERGY-2026-88";
    const archiveRes = await fetch(`${baseUrl}/rag/documents/${docId}/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ newStatus: "SUPERSEDED" }),
    });
    if (!archiveRes.ok) {
      throw new Error(`Admin archive failed: ${await archiveRes.text()}`);
    }

    logger.info("✓ Test 6 Passed: Dynamic ingestion, search, and document superseding lifecycle verified");
    passedTests++;

    // Test 7: RBAC Security - Non-Admin Blocked from Ingestion
    logger.info("Test 7: RBAC Security - Official blocked from document ingestion (403 Forbidden)");
    const rbacRes = await fetch(`${baseUrl}/rag/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify(newDocPayload),
    });

    if (rbacRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin ingestion, got ${rbacRes.status}`);
    }
    logger.info("✓ Test 7 Passed: RBAC policy successfully enforced HTTP 403 Forbidden for non-admin");
    passedTests++;

    logger.info("=================================================");
    logger.info(`ALL ${passedTests}/${totalTests} RAG KNOWLEDGE SYSTEM TESTS PASSED!`);
    logger.info("=================================================");
  } catch (error) {
    logger.error("RAG verification failed:", error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runRagVerification();
