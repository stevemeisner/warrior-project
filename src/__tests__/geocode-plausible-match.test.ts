import { describe, expect, it } from "vitest";
import { plausibleMatch } from "../lib/geocode";

// Shapes copied from real Mapbox v6 responses.
const austin = {
  name: "Austin",
  name_preferred: "Austin",
  context: {
    region: { name: "Texas", region_code: "TX" },
    country: { name: "United States", country_code: "US" },
  },
};
const boulder = {
  name: "Boulder",
  name_preferred: "Boulder",
  context: {
    region: { name: "Colorado", region_code: "CO" },
    country: { name: "United States", country_code: "US" },
  },
};
const tokyo = {
  name: "Tokyo",
  name_preferred: "東京都",
  context: {
    region: { name: "Tokyo Prefecture", region_code: "13" },
    country: { name: "Japan", country_code: "JP" },
  },
};
const paris = {
  name: "Paris",
  name_preferred: "Paris",
  context: {
    region: { name: "Paris", region_code: "75" },
    country: { name: "France", country_code: "FR" },
  },
};
// What Mapbox returned for the junk "CooranbonPortland, NSOR".
const nsororo = {
  name: "Nsororo",
  name_preferred: "Nsororo",
  context: {
    region: { name: "Kabarole", region_code: "405" },
    country: { name: "Uganda", country_code: "UG" },
  },
};

describe("plausibleMatch", () => {
  it("accepts exact city + state code", () => {
    expect(plausibleMatch("Austin", "TX", austin)).toBe(true);
  });

  it("accepts a full state name and a country name as the region", () => {
    expect(plausibleMatch("Austin", "Texas", austin)).toBe(true);
    expect(plausibleMatch("Paris", "France", paris)).toBe(true);
  });

  it("tolerates small typos in the city", () => {
    expect(plausibleMatch("Austn", "TX", austin)).toBe(true);
    expect(plausibleMatch("Bolder", "CO", boulder)).toBe(true);
  });

  it("tolerates a one-letter typo in a long region name", () => {
    expect(plausibleMatch("Austin", "Texs", austin)).toBe(true);
  });

  it("ignores case, punctuation and diacritics", () => {
    expect(plausibleMatch("  austin ", "tx.", austin)).toBe(true);
  });

  it("accepts a city with no state, but never an empty query", () => {
    expect(plausibleMatch("Tokyo", "", tokyo)).toBe(true);
    expect(plausibleMatch("", "", tokyo)).toBe(false);
  });

  it("rejects junk that Mapbox fuzzily matched to somewhere else", () => {
    expect(plausibleMatch("CooranbonPortland", "NSOR", nsororo)).toBe(false);
    expect(plausibleMatch("asdfgh", "ZZ", nsororo)).toBe(false);
  });

  it("rejects the right city in the wrong state", () => {
    // Mapbox may return Portland, Oregon for "Portland, ME" if ranking is off.
    const portlandOR = {
      name: "Portland",
      context: {
        region: { name: "Oregon", region_code: "OR" },
        country: { name: "United States", country_code: "US" },
      },
    };
    expect(plausibleMatch("Portland", "ME", portlandOR)).toBe(false);
    expect(plausibleMatch("Portland", "OR", portlandOR)).toBe(true);
  });

  it("does not let a short state code fuzzy-match", () => {
    expect(plausibleMatch("Austin", "TZ", austin)).toBe(false);
  });
});
