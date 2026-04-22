// Predefined pipe slots (fixed graph — hráč upgraduje, nemaže)
export const PIPE_SLOTS = {
  boiler_collector:  { from: 'boiler', to: 'collector',  media: 'steam',     segments: 2 },
  boiler_dynamo:     { from: 'boiler', to: 'dynamo',     media: 'steam',     segments: 3 },
  boiler_greenhouse: { from: 'boiler', to: 'greenhouse', media: 'hot_water', segments: 3 },
  boiler_distillery: { from: 'boiler', to: 'distillery', media: 'steam',     segments: 2 },
};

// SVG souřadnice v viewBox 160×90 (potrubí z kotle k uzlům)
// Kotel je uprostřed (~80,44), horní výstup ~25, dolní ~62
export const PIPE_COORDS = {
  boiler_collector:  { x1: 77, y1: 26, x2: 18, y2: 22 },
  boiler_distillery: { x1: 83, y1: 26, x2: 142, y2: 22 },
  boiler_dynamo:     { x1: 77, y1: 62, x2: 18,  y2: 76 },
  boiler_greenhouse: { x1: 83, y1: 62, x2: 142, y2: 76 },
};

export const MATERIALS = {
  wood: {
    label: 'Dřevěné',
    maxPressure: 30,
    resistance: 7,      // bar ztráta / segment
    degradation: 0.07,  // integrita / tick při provozu
    color: '#78350f',
    activeColor: '#92400e',
    strokeWidth: 1.0,
    buildCost: { wood: 4 },
  },
  copper: {
    label: 'Měděné',
    maxPressure: 60,
    resistance: 3,
    degradation: 0.04,
    color: '#b45309',
    activeColor: '#d97706',
    strokeWidth: 1.3,
    buildCost: { scrap: 15, parts: 3 },
  },
  steel: {
    label: 'Ocelové',
    maxPressure: 100,
    resistance: 1.5,
    degradation: 0.02,
    color: '#4b5563',
    activeColor: '#6b7280',
    strokeWidth: 1.6,
    buildCost: { scrap: 30, parts: 8 },
  },
};

// Minimální tlak potřebný aby uzel fungoval
export const NODE_MIN_PRESSURE = {
  collector:  15,
  dynamo:     40,
  greenhouse: 20,
  distillery: 30,
};

export const NODE_LABELS = {
  collector:  'Sběrač kondenzátu',
  dynamo:     'Dynamo',
  greenhouse: 'Pěstírna',
  distillery: 'Destilérka',
};

// Oprava záplatou: levnější, ale sníží maxIntegrityCap
export const REPAIR_COST = { scrap: 8, wood: 3 };
// Plná výměna: drahší, plný reset
export const REPLACE_COST = { scrap: 20, parts: 4 };
