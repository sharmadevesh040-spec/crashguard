/**
 * Normalizes ship data from the API to a consistent structure.
 */
export function normalizeShip(rawShip) {
  return {
    id: rawShip.shipName || rawShip.ship_name || rawShip.ShipName || Math.random().toString(36).substr(2, 9),
    name: rawShip.shipName || rawShip.ship_name || rawShip.ShipName || 'Unknown Ship',
    shipClass: rawShip.ship_class || rawShip.ShipClass || rawShip.shipClass || 'Unknown Class',
    price: rawShip.price || rawShip.Price || rawShip.cost || 'Unknown',
    capacity: rawShip.capacity || rawShip.max_passengers || rawShip.Capacity || 'Unknown',
    manufactureDate: rawShip.manufactureDate || rawShip.manufactured_at || rawShip.DateOfBuild || 'Unknown',
    status: rawShip.status || rawShip.Condition || rawShip.ship_status || 'Unknown',
    engineType: rawShip.technical_specs?.engine_data?.core_type || 'Unknown Engine',
  };
}
