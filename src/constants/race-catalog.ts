/**
 * A small, local seed of middle-distance races for the "find your race"
 * screen — there is no race database yet, so this stands in for what would
 * be a search endpoint. Matches the design's own example list.
 */
export type CatalogRace = {
  id: string;
  series: 'IRONMAN' | 'T100' | 'Challenge';
  distanceLabel: string;
  name: string;
  place: string;
  flag: string;
  date: string;
};

export const RaceCatalog: CatalogRace[] = [
  { id: 'im703-nice', series: 'IRONMAN', distanceLabel: 'HALF', name: 'IRONMAN 70.3 Nice', place: 'Nice, France', flag: '🇫🇷', date: '12 September 2027' },
  { id: 'im703-zell', series: 'IRONMAN', distanceLabel: 'HALF', name: 'IRONMAN 70.3 Zell am See-Kaprun', place: 'Zell am See, Austria', flag: '🇦🇹', date: '29 August 2027' },
  { id: 'im703-duisburg', series: 'IRONMAN', distanceLabel: 'HALF', name: 'IRONMAN 70.3 Duisburg', place: 'Duisburg, Germany', flag: '🇩🇪', date: '29 August 2027' },
  { id: 'im703-vichy', series: 'IRONMAN', distanceLabel: 'HALF', name: 'IRONMAN 70.3 Vichy', place: 'Vichy, France', flag: '🇫🇷', date: '22 August 2027' },
  { id: 't100-london', series: 'T100', distanceLabel: '100KM', name: 'London T100 Triathlon', place: 'London, UK', flag: '🇬🇧', date: '22 August 2027' },
  { id: 't100-vancouver', series: 'T100', distanceLabel: '100KM', name: 'Vancouver T100 Triathlon', place: 'Vancouver, Canada', flag: '🇨🇦', date: '15 August 2027' },
  { id: 'im703-rio', series: 'IRONMAN', distanceLabel: 'HALF', name: 'IRONMAN 70.3 Rio de Janeiro', place: 'Rio de Janeiro, Brazil', flag: '🇧🇷', date: '8 August 2027' },
  { id: 'im703-luxembourg', series: 'IRONMAN', distanceLabel: 'HALF', name: 'IRONMAN 70.3 Luxembourg', place: 'Mosaïle, Luxembourg', flag: '🇱🇺', date: '11 July 2027' },
];
