/**
 * FBI Crime Data Explorer (CDE) API client.
 * Docs: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi
 * API key as query param: api_key (get key at the doc URL).
 * Base: https://api.usa.gov/crime/fbi/ucr/
 *
 * The API returns aggregated UCR/NIBRS data (counts by agency, state, year).
 * It does NOT return incident-level lat/lon. For maps, use agency locations
 * (icpsr_lat, icpsr_lng) with counts, or state/county estimates for choropleths.
 */

import { FBI_CDE_API_KEY } from '../config';

const BASE_URL = 'https://api.usa.gov/crime/fbi/ucr';

function isConfigured(): boolean {
  return !!FBI_CDE_API_KEY;
}

function withApiKey(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${encodeURIComponent(FBI_CDE_API_KEY)}`;
}

export interface Pagination {
  count: number;
  page: number;
  pages: number;
  per_page: number;
}

/** Agency record; includes icpsr_lat, icpsr_lng for mapping. */
export interface CdeAgency {
  ori: string;
  agency_name: string;
  state_abbr: string | null;
  city_name: string | null;
  primary_county?: string | null;
  primary_county_fips?: string | null;
  icpsr_lat?: number | null;
  icpsr_lng?: number | null;
  population?: number | null;
  current_year?: number | null;
  [key: string]: unknown;
}

export interface AgenciesResponse {
  pagination: Pagination;
  results: CdeAgency[];
}

/** State-level crime estimates (annual). */
export interface CdeEstimatedCount {
  year: number;
  population: number;
  state_abbr?: string;
  violent_crime: number;
  homicide: number;
  rape_legacy: number;
  rape_revised?: number | null;
  robbery: number;
  aggravated_assault: number;
  property_crime: number;
  burglary: number;
  larceny: number;
  motor_vehicle_theft: number;
  caveats?: string | null;
  [key: string]: unknown;
}

export interface EstimatesResponse {
  pagination: Pagination;
  results: CdeEstimatedCount[];
}

/** Count record (e.g. from /counts). */
export interface CdeCountResult {
  year: number | string;
  count: number | null;
  [key: string]: unknown;
}

export interface CountsResponse {
  pagination: Pagination;
  results: CdeCountResult[];
}

/** Explorer offense names for /counts (see swagger explorer_offense enum). */
export type ExplorerOffense =
  | 'aggravated-assault'
  | 'arson'
  | 'burglary'
  | 'larceny'
  | 'motor-vehicle-theft'
  | 'homicide'
  | 'rape'
  | 'robbery';

/**
 * Fetch agencies (optionally filter by state). Use for map: agencies have
 * icpsr_lat, icpsr_lng (approximate agency location).
 */
export async function fetchAgencies(params: {
  state_abbr?: string;
  page?: number;
  per_page?: number;
}): Promise<AgenciesResponse> {
  if (!isConfigured()) {
    return { pagination: { count: 0, page: 1, pages: 0, per_page: 10 }, results: [] };
  }
  const sp = new URLSearchParams();
  if (params.state_abbr) sp.set('state_abbr', params.state_abbr);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.per_page != null) sp.set('per_page', String(params.per_page));
  const url = withApiKey(`${BASE_URL}/agencies?${sp.toString()}`);
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`FBI CDE API ${res.status}: ${text || res.statusText}`);
  return JSON.parse(text) as AgenciesResponse;
}

/**
 * Fetch state-level crime estimates. Use for choropleth (color state by rate).
 */
export async function fetchStateEstimates(
  stateAbbr: string,
  params?: { per_page?: number }
): Promise<EstimatesResponse> {
  if (!isConfigured()) {
    return { pagination: { count: 0, page: 1, pages: 0, per_page: 10 }, results: [] };
  }
  const sp = new URLSearchParams();
  if (params?.per_page != null) sp.set('per_page', String(params.per_page));
  const qs = sp.toString();
  const url = withApiKey(
    `${BASE_URL}/estimates/states/${encodeURIComponent(stateAbbr)}${qs ? `?${qs}` : ''}`
  );
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`FBI CDE API ${res.status}: ${text || res.statusText}`);
  return JSON.parse(text) as EstimatesResponse;
}

/**
 * Fetch national estimates (for comparison or national map).
 */
export async function fetchNationalEstimates(params?: {
  page?: number;
  per_page?: number;
}): Promise<EstimatesResponse> {
  if (!isConfigured()) {
    return { pagination: { count: 0, page: 1, pages: 0, per_page: 10 }, results: [] };
  }
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.per_page != null) sp.set('per_page', String(params.per_page));
  const url = withApiKey(`${BASE_URL}/estimates/national?${sp.toString()}`);
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`FBI CDE API ${res.status}: ${text || res.statusText}`);
  return JSON.parse(text) as EstimatesResponse;
}

/**
 * Fetch crime counts (e.g. by state, year, offense). Example: counts for NJ, 2022, robbery.
 */
export async function fetchCounts(params: {
  state?: string;
  'year>='?: number;
  'year<='?: number;
  explorer_offense?: ExplorerOffense;
  per_page?: number;
  page?: number;
}): Promise<CountsResponse> {
  if (!isConfigured()) {
    return { pagination: { count: 0, page: 1, pages: 0, per_page: 10 }, results: [] };
  }
  const sp = new URLSearchParams();
  if (params.state) sp.set('state', params.state);
  if (params['year>='] != null) sp.set('year', `>=${params['year>=']}`);
  if (params['year<='] != null) sp.set('year', `<=${params['year<=']}`);
  if (params.explorer_offense) sp.set('explorer_offense', params.explorer_offense);
  if (params.per_page != null) sp.set('per_page', String(params.per_page));
  if (params.page != null) sp.set('page', String(params.page));
  const url = withApiKey(`${BASE_URL}/counts?${sp.toString()}`);
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`FBI CDE API ${res.status}: ${text || res.statusText}`);
  return JSON.parse(text) as CountsResponse;
}

/**
 * Fetch state geo metadata (counties, participation). Use with estimates for choropleth.
 */
export async function fetchStateGeo(stateAbbr: string): Promise<{
  state_abbr: string;
  state_name: string;
  counties: Array<{ county_id: number; county_name: string; fips: string | null }>;
  current_year?: number;
  total_population?: number;
  [key: string]: unknown;
}> {
  if (!isConfigured()) {
    return { state_abbr: stateAbbr, state_name: '', counties: [] };
  }
  const url = withApiKey(
    `${BASE_URL}/geo/states/${encodeURIComponent(stateAbbr)}`
  );
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`FBI CDE API ${res.status}: ${text || res.statusText}`);
  return JSON.parse(text);
}

/**
 * Agencies with valid lat/lng for a state — use to plot points on a map.
 * Combine with agency-level counts (e.g. from participation or other endpoints) to size/color points.
 */
export async function fetchAgenciesWithLocation(stateAbbr: string): Promise<CdeAgency[]> {
  const data = await fetchAgencies({ state_abbr: stateAbbr, per_page: 1000 });
  return (data.results || []).filter(
    (a) => a.icpsr_lat != null && a.icpsr_lng != null
  ) as CdeAgency[];
}

export { isConfigured as isFbiCdeConfigured };
