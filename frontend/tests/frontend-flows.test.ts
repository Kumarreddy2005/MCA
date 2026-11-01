import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveCleanProblemTitle,
  resolveKarnatakaDistrict,
  extractLocationFromText,
  detectLocationConflict,
} from "../src/utils/locationHelper.js";

describe("VCGIS Frontend — Citizen Grievance & AI Assist Flow Tests", () => {
  it("1. Clean problem title derivation strips speech stuttering and repetition", () => {
    const rawStutterInput = "s is a is a water is a water problem is a water problem at bidrahalli";
    const cleanTitle = deriveCleanProblemTitle(rawStutterInput);
    assert.ok(cleanTitle.length > 5);
    // Must NOT contain repeated "is a water problem is a water problem"
    assert.doesNotMatch(cleanTitle, /water problem.*water problem/i);
  });

  it("2. Repeated AI Assist execution does NOT nest or duplicate complaint text", () => {
    const originalText = "Drinking water pipeline broken near public tap";
    // First pass
    const titlePass1 = deriveCleanProblemTitle(originalText, "Water Supply", "Drinking Water Supply");
    // Second pass simulating clicking AI assist again on already formatted text
    const titlePass2 = deriveCleanProblemTitle(titlePass1, "Water Supply", "Drinking Water Supply");
    assert.equal(titlePass1, titlePass2, "Repeated AI Assist should be idempotent and not duplicate text");

    // Simulating nested meta-prefix: "Citizen filed a grievance regarding 'Broken pipeline' under Water..."
    const nestedMeta = "Citizen filed a grievance regarding 'Broken pipeline' under Water Supply at Rampura";
    const unnested = deriveCleanProblemTitle(nestedMeta);
    assert.equal(unnested, "Broken pipeline");
  });

  it("3. Location Precedence: Explicit citizen district 'KR Puram, Bangalore' resolves to 'Bengaluru Urban', NEVER 'Mysuru'", () => {
    const districtResolved = resolveKarnatakaDistrict("KR Puram, Bangalore");
    assert.equal(districtResolved, "Bengaluru Urban");
    assert.notEqual(districtResolved, "Mysuru", "Must not default to Mysuru");
  });

  it("4. Location Extraction: Extracts local landmarks without silent default overwrite", () => {
    const sampleText = "Large pothole in front of Government Primary School at Bidrahalli cross";
    const loc = extractLocationFromText(sampleText);
    assert.ok(loc.reportedLocation);
    // Extracted landmark must match either Government Primary or Bidrahalli
    assert.match(loc.reportedLocation, /(Government Primary|Bidrahalli)/i);
  });

  it("5. Location Conflict Detection: Flags conflicting districts between text and form", () => {
    const conflict = detectLocationConflict("Mysuru", "There is a power outage in Bellary");
    assert.equal(conflict.hasConflict, true, "Must flag conflict when entered district differs from text district");
  });

  it("6. Unresolved Location Policy: Returns null for unknown locations without fallback overwrite", () => {
    const unresolved = resolveKarnatakaDistrict("Unknown Street Near Tree");
    assert.equal(unresolved, null, "Unresolved location must return null and never silently default");
  });
});
