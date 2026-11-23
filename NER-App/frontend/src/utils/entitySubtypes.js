/**
 * Verified Hierarchical Entity Taxonomy for IMD Agromet Advisories.
 * Source: IMD_Hierarchical_Entity_Taxonomy_Verified.pdf
 *
 * Every subcategory included here has been verified against at least one of:
 *   - CGIAR Agronomy Ontology (AgrO — local agro.txt, 2022-11-02)
 *   - FAO AGROVOC Ontology (live Skosmos REST API, agrovoc.fao.org)
 *
 * Only parent entities that have verified subcategories are listed here.
 * Entities not present in this map have no subcategories and render without a dropdown.
 */

const RAW_ENTITY_SUBTYPES = {
  Weather: [
    {
      name: 'Rainfall',
      agro: 'ENVO_01000830 (water-based rainfall); ENVO_01000875 (precipitation process)',
      agrovoc: 'c_6435 (rain); c_6161 (precipitation)',
    },
    {
      name: 'Humidity',
      agro: 'PATO_0015009 (humidity); AGRO_00000637 (relative humidity)',
      agrovoc: 'c_3689 (humidity); c_6496 (relative humidity)',
    },
    {
      name: 'Temperature (Temp)',
      agro: 'PATO_0000146 (temperature); ENVO_09200001 (temperature of air)',
      agrovoc: 'c_7657 (temperature); c_230 (air temperature)',
    },
    {
      name: 'Natural_Disaster / Weather Hazard',
      agro: 'ENVO_01000710 (flood); ENVO_02500002 (flooding); ENVO_1000745 (drought)',
      agrovoc: 'c_29581 (weather hazards); c_10391 (natural disasters); c_3113 (frost); c_14875 (thunderstorms); c_3469 (hail)',
    },
    {
      name: 'Sky / Atmospheric Condition',
      agro: 'ENVO_02500003 (atmospheric process); ENVO_01000793 (atmospheric wind)',
      agrovoc: 'c_15292 (weather)',
    },
  ],

  Crop: [
    {
      name: 'Field Crop Species',
      agro: 'AGRO_00000325 (crop); NCBITaxon_33090 (Viridiplantae)',
      agrovoc: 'c_1474 (cereals); c_3351 (grain legumes); c_5328 (oil crops); c_2876 (fibre crops); c_7503 (sugar crops)',
    },
    {
      name: 'Vegetable',
      agro: 'FOODON_00001261 (vegetable food product); FOODON_03411579 (vegetable-producing plant)',
      agrovoc: 'c_8174 (vegetables)',
    },
    {
      name: 'Fruit',
      agro: 'PO_0009001 (fruit); FOODON_00001262 (botanical fruit food product)',
      agrovoc: 'c_3131 (fruits)',
    },
    {
      name: 'Food_Item / Fodder Crop',
      agro: 'FOODON_00002403 (food material); FOODON_00001002 (food product)',
      agrovoc: 'c_2843 (feeds); c_2829 (feed crops); c_3032 (foods)',
    },
    {
      name: 'Variety / Cultivar',
      agro: null,
      agrovoc: 'c_8157 (varieties)',
    },
    {
      name: 'Growth Stage / Phenology',
      agro: 'PO_0009012 (plant structure development stage)',
      agrovoc: 'c_5959 (plant developmental stages)',
    },
    {
      name: 'Plant Part',
      agro: 'PO_0025131 (plant anatomical entity); AGRO_00000032 (planting material)',
      agrovoc: 'c_330912 (plant parts); c_5954 (plant anatomy)',
    },
  ],

  Chemical: [
    {
      name: 'Nutrient',
      agro: 'CHEBI_33284 (nutrient); CHEBI_167164 (mineral nutrient); CHEBI_33937 (macronutrient); CHEBI_27027 (micronutrient)',
      agrovoc: 'c_5274 (nutrients); c_5dbd59ad (macronutrients); c_7834 (trace elements)',
    },
    {
      name: 'Fertilizer & Soil Amendment',
      agro: 'AGRO_00002062 (agronomic fertilizer); AGRO_00002040 (inorganic fertilizer); CHEBI_48838 (gypsum)',
      agrovoc: 'c_2867 (fertilizers); c_27870 (inorganic fertilizers); c_7159 (soil amendments)',
    },
    {
      name: 'Micronutrient Salt / Foliar',
      agro: 'CHEBI_35176 (zinc sulfate); AGRO_00002040 (inorganic fertilizer)',
      agrovoc: 'c_4806 (micronutrient fertilizers)',
    },
    {
      name: 'Herbicide / Weedicide',
      agro: 'CHEBI_24527 (herbicide)',
      agrovoc: 'c_3566 (herbicides)',
    },
    {
      name: 'Insecticide',
      agro: 'CHEBI_24852 (insecticide)',
      agrovoc: 'c_3887 (insecticides)',
    },
    {
      name: 'Fungicide / Bactericide',
      agro: 'CHEBI_24127 (fungicide)',
      agrovoc: 'c_3146 (fungicides); c_9048 (bactericides)',
    },
    {
      name: 'Plant Growth Regulator (PGR)',
      agro: 'CHEBI_39317 (growth regulator)',
      agrovoc: 'c_5968 (plant growth substances)',
    },
    {
      name: 'Commercial Trade Formulation',
      agro: null,
      agrovoc: 'c_3068 (formulations)',
    },
  ],

  Organism: [
    {
      name: 'Insect Pest',
      agro: 'AGRO_00000035 (pest role)',
      agrovoc: 'c_5741 (pests); c_5729 (pest insects)',
    },
    {
      name: 'Weed',
      agro: 'AGRO_00002033 (weed role)',
      agrovoc: 'c_8347 (weeds)',
    },
    {
      name: 'Bio-Control Agent / Bio-Inoculant',
      agro: 'AGRO_00000069 (biological pest control agent role); AGRO_00020001 (biofertilizer)',
      agrovoc: 'c_920 (biological control agents); c_24975 (biofertilizers); c_27467 (biopesticides)',
    },
    {
      name: 'Plant Pathogen',
      agro: 'CHEBI_52209 (aetiopathogenetic role)',
      agrovoc: 'c_49904 (organisms); c_5962 (plant diseases)',
    },
  ],

  Disease: [
    {
      name: 'Biotic Disease (Fungal / Bacterial)',
      agro: 'OGMS_0000031 (disease); AGRO_00000660 (disease incidence); AGRO_00000661 (disease severity)',
      agrovoc: 'c_5962 (plant diseases); c_11042 (fungal diseases); c_770 (bacterial diseases)',
    },
    {
      name: 'Nutrient Deficiency Disorder',
      agro: 'OGMS_0000031 (disease)',
      agrovoc: 'c_2154 (deficiency diseases)',
    },
    {
      name: 'Abiotic / Physiological Disorder',
      agro: 'OGMS_0000031 (disease)',
      agrovoc: 'c_3144 (functional disorders)',
    },
    {
      name: 'Visual Symptom / Damage Sign',
      agro: null,
      agrovoc: 'c_7566 (symptoms)',
    },
  ],

  Agri_Process: [
    {
      name: 'Agri_Method / Cropping System',
      agro: 'AGRO_00000036 (application method); AGRO_00000638 (cropping system); AGRO_00000516 (intercropping)',
      agrovoc: 'c_1971 (cropping systems); c_2807 (farming systems); c_3910 (intercropping)',
    },
    {
      name: 'Treatment (Seed / Bio-Treatment)',
      agro: 'AGRO_00000322 (treatment); AGRO_00020001 (biofertilizer)',
      agrovoc: 'c_6940 (seed treatment); c_24975 (biofertilizers)',
    },
    {
      name: 'Land Preparation & Tillage',
      agro: 'AGRO_01000015 (tillage)',
      agrovoc: 'c_330639 (field preparation); c_7771 (tillage)',
    },
    {
      name: 'Sowing / Planting / Transplanting',
      agro: 'AGRO_00000231 (planting process); AGRO_00000142 (seeding process); AGRO_00000229 (plant transplanting process)',
      agrovoc: 'c_7268 (sowing); c_5992 (planting); c_7873 (transplanting)',
    },
    {
      name: 'Irrigation & Water Management',
      agro: 'AGRO_00000665 (water management process); AGRO_00000006 (irrigation process)',
      agrovoc: 'c_3954 (irrigation)',
    },
    {
      name: 'Inter-culture / Weeding / Thinning',
      agro: 'AGRO_00020006 (weeding process); AGRO_00000027 (thinning)',
      agrovoc: 'c_8346 (weeding); c_3642 (hoeing); c_7729 (thinning)',
    },
    {
      name: 'Chemical / Bio Application (Spraying)',
      agro: 'AGRO_00000024 (chemical pest control process); AGRO_00000022 (biological pest control process); AGRO_01000000 (agronomic fertilization process)',
      agrovoc: 'c_7334 (spraying)',
    },
    {
      name: 'Harvesting & Post-Harvest',
      agro: 'AGRO_00000025 (harvest process); AGRO_00000454 (threshing process)',
      agrovoc: 'c_3500 (harvesting); c_7739 (threshing)',
    },
  ],

  Agri_Equipment: [
    {
      name: 'Technology / Diagnostic Tool',
      agro: 'IAO_0000591 (software method); AGRO_00000357 (weather station)',
      agrovoc: 'c_7644 (technology); c_36660 (information technology)',
    },
    {
      name: 'Seeding & Residue Machinery',
      agro: 'AGRO_00000230 (planting implement); AGRO_00000232 (sowing implement); AGRO_00000225 (residue management implement)',
      agrovoc: 'c_25759 (planters); c_25753 (farm equipment)',
    },
    {
      name: 'Tillage & Trenching Implements',
      agro: 'AGRO_00000223 (tillage implement); AGRO_00000124 (tractor)',
      agrovoc: 'c_25768 (tillage equipment); c_6022 (ploughs)',
    },
    {
      name: 'Harvesting Machinery',
      agro: 'AGRO_00000234 (plant harvest implement)',
      agrovoc: 'c_3499 (harvesters)',
    },
    {
      name: 'Spraying & Bio-Release Devices',
      agro: 'AGRO_00000537 (sprayer); AGRO_00000227 (fertilization implement)',
      agrovoc: 'c_7333 (sprayers)',
    },
  ],

  Agri_Waste: [
    {
      name: 'Crop Residue / Straw / Stubble / Trash',
      agro: 'AGRO_00000154 (crop residue); ENVO_00003869 (straw); AGRO_00000098 (straw mulch)',
      agrovoc: 'c_16118 (crop residues); c_7441 (straw); c_16650 (stubble); c_4977 (mulches)',
    },
    {
      name: 'Organic Manure / Compost (FYM)',
      agro: 'AGRO_00000079 (animal manure); ENVO_00002170 (compost); AGRO_00002039 (organic fertilizer)',
      agrovoc: 'c_2810 (farmyard manure); c_4592 (organic fertilizers); c_1795 (composts)',
    },
  ],

  Soil: [
    {
      name: 'Soil Texture',
      agro: 'PECO_0007050 (soil texture exposure); ENVO_09200009 (structure of soil)',
      agrovoc: 'c_7199 (soil texture); c_7204 (soil types)',
    },
    {
      name: 'Soil Fertility / Nutrient Status',
      agro: 'ENVO_00003082 (enriched soil); ENVO_00001998 (soil)',
      agrovoc: 'c_7170 (soil fertility)',
    },
    {
      name: 'Soil Moisture / Drainage / Waterlogging',
      agro: 'ENVO_09200015 (humidity of soil)',
      agrovoc: 'c_7205 (soil water); c_7208 (soil water content); c_2372 (drainage); c_8333 (waterlogging)',
    },
    {
      name: 'Natural_Resource (Water)',
      agro: 'ENVO_00002006 (liquid water); AGRO_00000009 (irrigation source); ENVO_00000063 (water body)',
      agrovoc: 'c_5091 (natural resources); c_8309 (water); c_3958 (irrigation water)',
    },
  ],

  Quantity: [
    {
      name: 'Application Rate / Dosage',
      agro: 'PATO_0001351 (area density); UO_0000054 (area density unit)',
      agrovoc: 'c_16113 (application rates); c_36906 (dosage)',
    },
    {
      name: 'Mass / Weight',
      agro: 'PATO_0000125 (mass); UO_0000002 (mass unit)',
      agrovoc: 'c_4639 (mass)',
    },
    {
      name: 'Volume',
      agro: 'PATO_0000918 (volume); UO_0000095 (volume unit)',
      agrovoc: 'c_8288 (volume)',
    },
    {
      name: 'Concentration / Percentage / Ratio',
      agro: 'PATO_0000033 (concentration of); UO_0000051 (concentration unit); UO_0000187 (percent)',
      agrovoc: 'c_36906 (dosage); c_50324 (units)',
    },
    {
      name: 'Field_Area',
      agro: 'UO_0000047 (area unit); PATO_0001323 (area)',
      agrovoc: 'c_330588 (area); c_2894 (fields)',
    },
    {
      name: 'Length / Depth / Spacing',
      agro: 'PATO_0000122 (length); UO_0000001 (length unit)',
      agrovoc: 'c_4260 (length); c_7272 (spacing)',
    },
    {
      name: 'Other_Quantity (Counts / Thresholds)',
      agro: 'UO_0000186 (dimensionless unit); UO_0000189 (count unit); PATO_0001555 (has number of)',
      agrovoc: 'c_24921 (economic thresholds); c_4668 (measurement)',
    },
    {
      name: 'Money / Price',
      agro: null,
      agrovoc: 'c_6178 (prices); c_1922 (costs); c_28662 (currencies)',
    },
  ],

  Date_and_Time: [
    {
      name: 'Calendar Date / Fortnight / Month',
      agro: 'AGRO_00010126 (irrigation date); AGRO_00010128 (harvesting date); IAO_0000416 (time measurement datum)',
      agrovoc: 'c_16208 (sowing date); c_29464 (harvesting date); c_7779 (timing)',
    },
    {
      name: 'Duration / Interval / Crop Age',
      agro: 'PATO_0001309 (duration); UO_0000003 (time unit)',
      agrovoc: 'c_2412 (duration); c_7778 (time)',
    },
    {
      name: 'Season',
      agro: 'ENVO_03000096 (season); ENVO_03000129 (monsoon season)',
      agrovoc: 'c_6911 (seasons)',
    },
  ],

  Location: [
    {
      name: 'Administrative Region (Location)',
      agro: 'ENVO_00000004 (administrative region); ENVO_00000000 (geographic feature)',
      agrovoc: 'c_331000 (site)',
    },
    {
      name: 'Agro-Climatic / Topographic Zone',
      agro: 'ENVO_01000408 (environmental zone)',
      agrovoc: 'c_28638 (agroclimatic zones)',
    },
    {
      name: 'Organization',
      agro: 'OBI_0000245 (organization); OBI_0000828 (research organization)',
      agrovoc: 'c_37968 (organizations); c_6514 (research institutions)',
    },
    {
      name: 'Person / Stakeholder',
      agro: 'AGRO_00000378 (person role within the experiment); AGRO_00000372 (farmer); AGRO_00000376 (extension agent)',
      agrovoc: 'c_2805 (farmers); c_3683 (human population)',
    },
  ],
};

/**
 * Filter strictly to subcategories with a verified mapping in CGIAR AgrO or FAO AGROVOC,
 * and attach normalized `ontologies` metadata.
 */
export const ENTITY_SUBTYPES = Object.fromEntries(
  Object.entries(RAW_ENTITY_SUBTYPES)
    .map(([parent, list]) => [
      parent,
      list
        .filter((item) => Boolean(item.agro || item.agrovoc))
        .map((item) => ({
          ...item,
          ontologies: [
            ...(item.agro ? ['AgrO'] : []),
            ...(item.agrovoc ? ['AGROVOC'] : []),
          ],
        })),
    ])
    .filter(([, list]) => list.length > 0)
);

/** Returns the verified ontology-backed subcategories for a parent entity, or []. */
export function getEntitySubtypes(entityType) {
  return ENTITY_SUBTYPES[entityType] || [];
}

/**
 * Existing flat entity types that have been nested as subcategories under one of
 * the 12 parent entities in the taxonomy. These are hidden as standalone cards
 * in the Entity Palette so they only appear inside their parent's dropdown.
 */
export const SUBSUMED_ENTITY_TYPES = new Set([
  // Under Weather
  'Rainfall',
  'Humidity',
  'Temp',
  'Natural_Disaster',
  // Under Crop
  'Vegetable',
  'Fruit',
  'Food_Item',
  // Under Chemical
  'Nutrient',
  // Under Agri_Process
  'Agri_Method',
  'Treatment',
  // Under Agri_Equipment
  'Technology',
  // Under Soil
  'Natural_Resource',
  // Under Quantity
  'Field_Area',
  'Other_Quantity',
  'Money',
  // Under Date_and_Time
  'Duration',
  'Season',
  // Under Location
  'Organization',
  'Person',
]);
