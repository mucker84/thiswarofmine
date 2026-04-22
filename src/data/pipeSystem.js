// Predefined pipe slots (fixed graph — hráč upgraduje, nemaže)
export const PIPE_SLOTS = {
  boiler_collector:  { from: 'boiler', to: 'collector',  media: 'steam',     segments: 2 },
  boiler_dynamo:     { from: 'boiler', to: 'dynamo',     media: 'steam',     segments: 3 },
  boiler_greenhouse: { from: 'boiler', to: 'greenhouse', media: 'hot_water', segments: 3 },
  boiler_distillery: { from: 'boiler', to: 'distillery', media: 'steam',     segments: 2 },
};

// SVG souřadnice v viewBox 160×90
export const PIPE_COORDS = {
  boiler_collector:  { x1: 77, y1: 26, x2: 18, y2: 22 },
  boiler_distillery: { x1: 83, y1: 26, x2: 142, y2: 22 },
  boiler_dynamo:     { x1: 77, y1: 62, x2: 18,  y2: 76 },
  boiler_greenhouse: { x1: 83, y1: 62, x2: 142, y2: 76 },
};

export const MATERIALS = {
  wood: {
    label: 'Dřevěné',
    maxPressure: 5,      // bar
    resistance: 0.7,     // bar/segment
    degradation: 0.07,
    color: '#78350f',
    activeColor: '#92400e',
    strokeWidth: 1.0,
    buildCost: { wood: 8, scrap: 4 },
  },
  copper: {
    label: 'Měděné',
    maxPressure: 10,
    resistance: 0.3,
    degradation: 0.04,
    color: '#b45309',
    activeColor: '#d97706',
    strokeWidth: 1.3,
    buildCost: { scrap: 16, parts: 2, gaskets: 2 },
  },
  steel: {
    label: 'Ocelové',
    maxPressure: 15,
    resistance: 0.15,
    degradation: 0.02,
    color: '#4b5563',
    activeColor: '#6b7280',
    strokeWidth: 1.6,
    buildCost: { scrap: 20, parts: 5, gaskets: 4 },
  },
};

// Minimální tlak (bar) potřebný aby uzel fungoval
export const NODE_MIN_PRESSURE = {
  collector:  1.5,
  dynamo:     4.0,
  greenhouse: 2.0,
  distillery: 3.0,
};

export const NODE_LABELS = {
  collector:  'Sběrač kondenzátu',
  dynamo:     'Dynamo',
  greenhouse: 'Pěstírna',
  distillery: 'Destilérka',
};

// Záplata: levnější, sníží maxIntegrityCap
export const REPAIR_COST   = { scrap: 5, gaskets: 1 };
// Plná výměna: dražší, plný reset
export const REPLACE_COST  = { scrap: 18, parts: 3, gaskets: 2 };
// Výroba těsnění (bez dílny)
export const GASKET_CRAFT_COST = { scrap: 3, wood: 2 };
