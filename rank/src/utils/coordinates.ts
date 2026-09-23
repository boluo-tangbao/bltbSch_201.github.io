export type CoordinatePoint = { lng: number; lat: number }

const PI = Math.PI
const X_PI = PI * 3000 / 180
const EARTH_RADIUS = 6378245
const ECCENTRICITY_SQUARED = 0.006693421622965943

function outsideChina(lng: number, lat: number) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(lng: number, lat: number) {
  let result = -100 + 2 * lng + 3 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  result += (20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2 / 3
  result += (20 * Math.sin(lat * PI) + 40 * Math.sin(lat / 3 * PI)) * 2 / 3
  result += (160 * Math.sin(lat / 12 * PI) + 320 * Math.sin(lat * PI / 30)) * 2 / 3
  return result
}

function transformLng(lng: number, lat: number) {
  let result = 300 + lng + 2 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  result += (20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2 / 3
  result += (20 * Math.sin(lng * PI) + 40 * Math.sin(lng / 3 * PI)) * 2 / 3
  result += (150 * Math.sin(lng / 12 * PI) + 300 * Math.sin(lng / 30 * PI)) * 2 / 3
  return result
}

function wgs84ToGcj02(lng: number, lat: number): CoordinatePoint {
  if (outsideChina(lng, lat)) return { lng, lat }
  const latitudeRadians = lat / 180 * PI
  let magic = Math.sin(latitudeRadians)
  magic = 1 - ECCENTRICITY_SQUARED * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  const latitudeOffset = transformLat(lng - 105, lat - 35) * 180 / ((EARTH_RADIUS * (1 - ECCENTRICITY_SQUARED)) / (magic * sqrtMagic) * PI)
  const longitudeOffset = transformLng(lng - 105, lat - 35) * 180 / (EARTH_RADIUS / sqrtMagic * Math.cos(latitudeRadians) * PI)
  return { lng: lng + longitudeOffset, lat: lat + latitudeOffset }
}

/** Convert stored WGS84 coordinates to the BD-09 coordinates expected by BMapGL. */
export function wgs84ToBd09(lng: number, lat: number): CoordinatePoint {
  const gcj = wgs84ToGcj02(lng, lat)
  const radius = Math.sqrt(gcj.lng * gcj.lng + gcj.lat * gcj.lat) + 0.00002 * Math.sin(gcj.lat * X_PI)
  const angle = Math.atan2(gcj.lat, gcj.lng) + 0.000003 * Math.cos(gcj.lng * X_PI)
  return { lng: radius * Math.cos(angle) + 0.0065, lat: radius * Math.sin(angle) + 0.006 }
}
