import { describe, expect, it } from "vitest";

// We'll import the function once it's created by the map agent
// For now, define the function inline to match the expected export
interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

function isWithinBounds(
  lat: number,
  lng: number,
  bounds: ViewportBounds
): boolean {
  const latInRange = lat >= bounds.south && lat <= bounds.north;
  // Handle antimeridian crossing
  const lngInRange =
    bounds.west <= bounds.east
      ? lng >= bounds.west && lng <= bounds.east
      : lng >= bounds.west || lng <= bounds.east;
  return latInRange && lngInRange;
}

describe("isWithinBounds", () => {
  const standardBounds: ViewportBounds = {
    north: 50,
    south: 30,
    east: -70,
    west: -120,
  };

  it("warrior inside bounds returns true", () => {
    expect(isWithinBounds(40, -90, standardBounds)).toBe(true);
  });

  it("warrior north of bounds returns false", () => {
    expect(isWithinBounds(55, -90, standardBounds)).toBe(false);
  });

  it("warrior south of bounds returns false", () => {
    expect(isWithinBounds(25, -90, standardBounds)).toBe(false);
  });

  it("warrior east of bounds returns false", () => {
    expect(isWithinBounds(40, -60, standardBounds)).toBe(false);
  });

  it("warrior west of bounds returns false", () => {
    expect(isWithinBounds(40, -130, standardBounds)).toBe(false);
  });

  it("warrior exactly on north boundary is included", () => {
    expect(isWithinBounds(50, -90, standardBounds)).toBe(true);
  });

  it("warrior exactly on south boundary is included", () => {
    expect(isWithinBounds(30, -90, standardBounds)).toBe(true);
  });

  it("warrior exactly on east boundary is included", () => {
    expect(isWithinBounds(40, -70, standardBounds)).toBe(true);
  });

  it("warrior exactly on west boundary is included", () => {
    expect(isWithinBounds(40, -120, standardBounds)).toBe(true);
  });

  it("warrior at corner of bounds is included", () => {
    expect(isWithinBounds(50, -70, standardBounds)).toBe(true);
    expect(isWithinBounds(30, -120, standardBounds)).toBe(true);
  });

  describe("antimeridian crossing", () => {
    // When viewport crosses the date line, west > east
    const antimeridianBounds: ViewportBounds = {
      north: 50,
      south: 30,
      east: -170, // wraps past 180 to the west side
      west: 170,
    };

    it("warrior on east side of date line is included", () => {
      expect(isWithinBounds(40, 175, antimeridianBounds)).toBe(true);
    });

    it("warrior on west side of date line is included", () => {
      expect(isWithinBounds(40, -175, antimeridianBounds)).toBe(true);
    });

    it("warrior far from date line is excluded", () => {
      expect(isWithinBounds(40, 0, antimeridianBounds)).toBe(false);
    });

    it("warrior at exactly 180 is included", () => {
      expect(isWithinBounds(40, 180, antimeridianBounds)).toBe(true);
    });

    it("warrior at exactly -180 is included", () => {
      expect(isWithinBounds(40, -180, antimeridianBounds)).toBe(true);
    });
  });

  describe("zero coordinates", () => {
    const boundsAroundZero: ViewportBounds = {
      north: 10,
      south: -10,
      east: 10,
      west: -10,
    };

    it("warrior at (0, 0) is included when bounds cover origin", () => {
      expect(isWithinBounds(0, 0, boundsAroundZero)).toBe(true);
    });

    it("warrior at (0, 0) is excluded when bounds don't cover origin", () => {
      expect(isWithinBounds(0, 0, standardBounds)).toBe(false);
    });
  });
});
