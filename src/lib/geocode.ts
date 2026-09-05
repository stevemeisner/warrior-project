/**
 * Resolve a city/state pair to map coordinates via Mapbox Geocoding v6.
 *
 * Accounts store `location.{latitude,longitude}`; the map only plots accounts
 * whose coordinates are real (0,0 is the "not geocoded" sentinel). City-level
 * precision is intentional — it matches the "approximate location" promise in
 * privacy settings.
 *
 * Mapbox matches fuzzily and never says how confident it is for places, so a
 * typo like "Austn, TX" resolves to Austin (good) but "asdfgh, ZZ" resolves to
 * a village in Uganda (bad). `plausibleMatch` keeps the first kind and rejects
 * the second: the typed city must resemble the returned place, and the typed
 * state must match the returned region or country.
 */
export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}

interface GeocodeFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    name_preferred?: string;
    full_address?: string;
    context?: {
      region?: { name?: string; region_code?: string };
      country?: { name?: string; country_code?: string };
    };
  };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Levenshtein distance; inputs are short place names so O(n·m) is fine. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export function plausibleMatch(
  typedCity: string,
  typedState: string,
  props: NonNullable<GeocodeFeature["properties"]>,
): boolean {
  const city = normalize(typedCity);
  const state = normalize(typedState);
  const candidates = [props.name, props.name_preferred].filter(
    (n): n is string => !!n,
  ).map(normalize);

  if (city) {
    const tolerance = city.length <= 4 ? 1 : 2;
    const cityOk = candidates.some(
      (c) => c.includes(city) || city.includes(c) || editDistance(c, city) <= tolerance,
    );
    if (!cityOk) return false;
  }

  if (state) {
    const region = props.context?.region;
    const country = props.context?.country;
    const stateOk = [
      region?.name,
      region?.region_code,
      country?.name,
      country?.country_code,
    ]
      .filter((n): n is string => !!n)
      .map(normalize)
      .some((n) => n === state || (state.length > 3 && editDistance(n, state) <= 1));
    if (!stateOk) return false;
  }

  return city.length > 0 || state.length > 0;
}

export async function geocodeCityState(
  city: string,
  state: string,
): Promise<GeocodedLocation | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const query = [city.trim(), state.trim()].filter(Boolean).join(", ");
  if (!token || !query) return null;

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("types", "place,region");
  url.searchParams.set("limit", "3");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: GeocodeFeature[] };
    const feature = data.features?.find(
      (f) => f.properties && f.geometry?.coordinates && plausibleMatch(city, state, f.properties),
    );
    if (!feature) return null;

    const props = feature.properties!;
    const [longitude, latitude] = feature.geometry!.coordinates!;
    const region = props.context?.region;
    return {
      longitude,
      latitude,
      city: props.name ?? (city.trim() || undefined),
      // Prefer the short code ("TX"); fall back to the region name, then the
      // country for places without a region.
      state:
        region?.region_code && /^[A-Za-z]+$/.test(region.region_code)
          ? region.region_code
          : region?.name ?? props.context?.country?.name ?? (state.trim() || undefined),
    };
  } catch {
    return null;
  }
}
