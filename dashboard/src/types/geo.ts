export type LatLng = {
  lat: number;
  lng: number;
};

export type BoundingBox = {
  sw: LatLng;
  ne: LatLng;
};

export type GeoSegment = {
  id: string;
  path: LatLng[];
  name?: string;
};
