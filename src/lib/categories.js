export const CATEGORIES = [
  // EXISTENTES
  { key: 'recycling',        label: 'Reciclaje',          ql: ['["amenity"="recycling"]'] },
  { key: 'food_bank',        label: 'Banco de alimentos', ql: ['["social_facility"="food_bank"]'] },
  { key: 'library',          label: 'Biblioteca',         ql: ['["amenity"="library"]'] },
  { key: 'clinic',           label: 'Clínica',            ql: ['["amenity"="clinic"]'] },
  { key: 'pharmacy',         label: 'Farmacia',           ql: ['["amenity"="pharmacy"]'] },
  { key: 'community_centre', label: 'Centro comunitario', ql: ['["amenity"="community_centre"]'] },
  { key: 'hospital',         label: 'Hospital',           ql: ['["amenity"="hospital"]'] },

  // NUEVAS
  { key: 'doctors',          label: 'Doctor / Consultorio', ql: [
      '["amenity"="doctors"]',
      '["healthcare"="doctor"]'
  ]},
  { key: 'dentist',          label: 'Dentista', ql: [
      '["amenity"="dentist"]',
      '["healthcare"="dentist"]'
  ]},
  { key: 'mental_health',    label: 'Centro de salud mental', ql: [
      '["healthcare"="psychotherapist"]',
      '["healthcare"="psychologist"]',
      '["social_facility"="therapy"]'
  ]},
  { key: 'veterinary',       label: 'Veterinaria', ql: ['["amenity"="veterinary"]'] },
  { key: 'soup_kitchen',     label: 'Comedor comunitario', ql: ['["social_facility"="soup_kitchen"]'] },
]

// NOTA: este builder ahora SOLO usa las categorías seleccionadas.
// Si no hay ninguna, quien lo llame debe evitar ejecutar la consulta.
export function buildOverpassQL({ lat, lon, radiusMeters, activeKeys }) {
  const selected = CATEGORIES.filter(c => activeKeys?.includes(c.key))
  const parts = selected.flatMap(cat =>
    cat.ql.map(cond => `nwr(around:${radiusMeters},${lat},${lon})${cond};`)
  )
  return `
[out:json][timeout:25];
(
  ${parts.join('\n  ')}
);
out center tags;
`.trim()
}