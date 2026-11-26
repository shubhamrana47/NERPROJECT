/**
 * Verified Hierarchical Entity Taxonomy for IMD Agromet Advisories.
 * Sources:
 *   - NER_App_Subcategory_Ontology_Guide_v3.pdf
 *   - NER_App_New_Subcategories_Ontology_Descriptions_Examples_v3.pdf
 *
 * Every subcategory included here is checked against:
 *   - CGIAR Agronomy Ontology (AgrO — local agro.owl, 2022-11-02)
 *   - FAO AGROVOC Ontology (live Skosmos REST API, agrovoc.fao.org)
 *
 * v3 counts (strict ontology filter on NEW subcategories): 59 subcategories across 12 parent entities:
 *   - 53 in CGIAR AgrO + FAO AGROVOC
 *   - 4 in CGIAR AgrO only
 *   - 2 in FAO AGROVOC only
 *   - Excluded: Disease -> Visual Symptom / Damage Sign (NEW, no match in AgrO or AGROVOC)
 *
 * Only parent entities that have ontology-verified subcategories are listed here.
 * Existing independent entities (Policy, Citation, ML_Model, Agri_Pollution, Event, Other,
 * Organization, Person, Natural_Resource) remain unchanged as standalone cards with no dropdown.
 */

const RAW_ENTITY_SUBTYPES = {
  Weather: [
    {
      name: 'Rainfall',
      legacyLabel: 'Rainfall',
      description: 'Liquid water precipitation falling from the atmosphere onto land and crops.',
      agro: 'ENVO_01000830 (water-based rainfall); ENVO_01000875 (precipitation process)',
      agrovoc: 'c_6435 (rain); c_6161 (precipitation)',
    },
    {
      name: 'Humidity',
      legacyLabel: 'Humidity',
      description: 'Amount of water vapor or relative moisture present in the surrounding air.',
      agro: 'PATO_0015009 (humidity); AGRO_00000637 (relative humidity)',
      agrovoc: 'c_3689 (humidity); c_6496 (relative humidity)',
    },
    {
      name: 'Temperature (Temp)',
      legacyLabel: 'Temp',
      description: 'Air or ambient thermal conditions affecting crop growth and field operations.',
      agro: 'PATO_0000146 (temperature); ENVO_09200001 (temperature of air)',
      agrovoc: 'c_7657 (temperature); c_230 (air temperature)',
    },
    {
      name: 'Natural_Disaster / Weather Hazard',
      legacyLabel: 'Natural_Disaster',
      description: 'Extreme weather hazards and natural disasters such as flood, drought, frost, hail, or thunderstorms.',
      agro: 'ENVO_01000710 (flood); ENVO_02500002 (flooding); ENVO_1000745 (drought)',
      agrovoc: 'c_29581 (weather hazards); c_10391 (natural disasters); c_3113 (frost); c_14875 (thunderstorms); c_3469 (hail)',
    },
    {
      name: 'Sky / Atmospheric Condition',
      description: 'Atmospheric conditions at a particular time and place, including cloudiness, wind, visibility, and sky state.',
      agro: 'ENVO_02500003 (atmospheric process); ENVO_01000793 (atmospheric wind)',
      agrovoc: 'c_15292 (weather); c_1681 (clouds)',
    },
  ],

  Crop: [
    {
      name: 'Field Crop Species',
      description: 'Cultivated plants harvested for food, fodder, fibre, oil, or sugar, including cereals, grain legumes, oilseeds, fibre crops, and sugar crops.',
      agro: 'AGRO_00000325 (crop); NCBITaxon_33090 (Viridiplantae)',
      agrovoc: 'c_1474 (cereals); c_3351 (grain legumes); c_5328 (oil crops); c_2876 (fibre crops); c_7503 (sugar crops)',
    },
    {
      name: 'Vegetable',
      legacyLabel: 'Vegetable',
      description: 'Vegetable-producing plants and edible vegetable crops.',
      agro: 'FOODON_00001261 (vegetable food product); FOODON_03411579 (vegetable-producing plant)',
      agrovoc: 'c_8174 (vegetables)',
    },
    {
      name: 'Fruit',
      legacyLabel: 'Fruit',
      description: 'Fruit-bearing crops and botanical fruit food products.',
      agro: 'PO_0009001 (fruit); FOODON_00001262 (botanical fruit food product)',
      agrovoc: 'c_3131 (fruits)',
    },
    {
      name: 'Food_Item / Fodder Crop',
      legacyLabel: 'Food_Item',
      description: 'Food materials, food products, livestock feeds, and fodder crops.',
      agro: 'FOODON_00002403 (food material); FOODON_00001002 (foodon product type)',
      agrovoc: 'c_2843 (feeds); c_2829 (feed crops); c_3032 (foods)',
    },
    {
      name: 'Variety / Cultivar',
      description: 'A grouping of plants defined by reproducible distinctive traits (local, improved, or hybrid seed varieties) within a species.',
      agro: 'AGRO_00000616 (seed variety type); AGRO_00000617 (local seed variety); AGRO_00000618 (improved seed variety); AGRO_00000619 (hybrid seed variety)',
      agrovoc: 'c_8157 (varieties)',
    },
    {
      name: 'Growth Stage / Phenology',
      description: 'A developmental stage in the life of a plant or plant structure, such as booting, branching, bud initiation, or flowering.',
      agro: 'PO_0009012 (plant structure development stage)',
      agrovoc: 'c_5959 (plant developmental stages)',
    },
    {
      name: 'Plant Part',
      description: 'An anatomical part of a plant or planting material (such as seed, cutting, ratoon, root nodules, or aerial organs).',
      agro: 'PO_0025131 (plant anatomical entity); AGRO_00000032 (planting material)',
      agrovoc: 'c_330912 (plant parts)',
    },
  ],

  Chemical: [
    {
      name: 'Nutrient',
      legacyLabel: 'Nutrient',
      description: 'Essential mineral macronutrients and micronutrients required for plant growth.',
      agro: 'CHEBI_33284 (nutrient); CHEBI_167164 (mineral nutrient); CHEBI_33937 (macronutrient); CHEBI_27027 (micronutrient)',
      agrovoc: 'c_5274 (nutrients); c_7834 (trace elements)',
    },
    {
      name: 'Fertilizer & Soil Amendment',
      description: 'Mineral or organic fertilizers and soil amendments (such as gypsum, lime, or inorganic fertilizers) applied to supply nutrients or improve soil properties.',
      agro: 'AGRO_00002062 (agronomic fertilizer); AGRO_00002040 (inorganic fertilizer); CHEBI_48838 (gypsum)',
      agrovoc: 'c_2867 (fertilizers); c_27870 (inorganic fertilizers); c_7159 (soil amendments)',
    },
    {
      name: 'Micronutrient Salt / Foliar',
      description: 'Micronutrient fertilizers and mineral salts (such as zinc sulfate or copper sulfate) applied to soil or foliage.',
      agro: 'CHEBI_35176 (zinc sulfate); AGRO_00002040 (inorganic fertilizer)',
      agrovoc: 'c_4806 (micronutrient fertilizers)',
    },
    {
      name: 'Herbicide / Weedicide',
      description: 'A chemical or biological substance used to kill or inhibit the germination and growth of unwanted plants and weeds.',
      agro: 'CHEBI_24527 (herbicide)',
      agrovoc: 'c_3566 (herbicides)',
    },
    {
      name: 'Insecticide',
      description: 'A substance used for preventing, destroying, repelling, or controlling insect pests.',
      agro: 'CHEBI_24852 (insecticide)',
      agrovoc: 'c_3887 (insecticides)',
    },
    {
      name: 'Fungicide / Bactericide',
      description: 'A substance with fungicidal or antimicrobial properties used to destroy fungal plant pests.',
      agro: 'CHEBI_24127 (fungicide)',
      agrovoc: 'c_3146 (fungicides)',
    },
    {
      name: 'Plant Growth Regulator (PGR)',
      description: 'Natural or synthetic compounds (such as auxins, gibberellins, or ethephon) that alter plant growth, dormancy, flowering, or height.',
      agro: 'CHEBI_39317 (growth regulator)',
      agrovoc: 'c_5968 (plant growth substances)',
    },
    {
      name: 'Commercial Trade Formulation',
      description: 'A physical combination of ingredients (such as emulsifiable concentrates, granules, or foams) formulated for effective field application.',
      agro: null,
      agrovoc: 'c_3068 (formulations)',
    },
  ],

  Organism: [
    {
      name: 'Insect Pest',
      description: 'Any unwanted insect species or pest harmful to crops, plant products, or agricultural environments.',
      agro: 'AGRO_00000035 (pest role)',
      agrovoc: 'c_5741 (pests); c_5729 (pest insects)',
    },
    {
      name: 'Weed',
      description: 'An unwanted wild plant growing in competition with cultivated crops.',
      agro: 'AGRO_00002033 (weed role)',
      agrovoc: 'c_8347 (weeds)',
    },
    {
      name: 'Bio-Control Agent / Bio-Inoculant',
      description: 'Living microorganisms, natural enemies, biofertilizers, or biopesticides used to suppress pests or boost plant nutrient availability.',
      agro: 'AGRO_00000069 (biological pest control agent role); AGRO_00020001 (biofertilizer)',
      agrovoc: 'c_920 (biological control agents); c_24975 (biofertilizers); c_27467 (biopesticides)',
    },
    {
      name: 'Plant Pathogen',
      description: 'Harmful fungi, bacteria, or pathogenic agents causing disease or damage to plants and crops.',
      agro: 'NCBITaxon_4751 (Fungi); NCBITaxon_2 (Bacteria); AGRO_00000035 (pest role)',
      agrovoc: 'c_5741 (pests)',
    },
  ],

  Disease: [
    {
      name: 'Biotic Disease (Fungal / Bacterial)',
      description: 'A plant disease in which a living pathogen (such as fungi or bacteria) interferes with normal plant functions over time.',
      agro: 'OGMS_0000031 (disease)',
      agrovoc: 'c_5962 (plant diseases); c_11042 (fungal diseases)',
    },
    {
      name: 'Nutrient Deficiency Disorder',
      description: 'A pathological disorder in a plant caused by insufficient supply of essential mineral nutrients.',
      agro: 'OGMS_0000031 (disease)',
      agrovoc: null,
    },
    {
      name: 'Abiotic / Physiological Disorder',
      description: 'A non-infectious pathological or physiological disorder in a plant caused by environmental or abiotic stress.',
      agro: 'OGMS_0000031 (disease)',
      agrovoc: null,
    },
  ],

  Agri_Process: [
    {
      name: 'Agri_Method',
      legacyLabel: 'Agri_Method',
      description: 'Agronomic methods, application techniques, and operational cultural practices used in farming (such as foliar spraying, broadcasting, line sowing, or dibbling).',
      agro: 'AGRO_00000036 (application method)',
      agrovoc: 'c_542 (application methods); c_29762 (cultural methods)',
    },
    {
      name: 'Cropping System',
      description: 'Spatial and temporal arrangement of crops grown on land and their management systems (such as intercropping, crop rotation, monocropping, or mixed cropping).',
      agro: 'AGRO_00000638 (cropping system); AGRO_00000516 (intercropping)',
      agrovoc: 'c_1971 (cropping systems); c_2807 (farming systems); c_3910 (intercropping)',
    },
    {
      name: 'Treatment (Seed / Bio-Treatment)',
      legacyLabel: 'Treatment',
      description: 'Preventive or curative agronomic treatments applied to seeds or crops.',
      agro: 'AGRO_00000322 (treatment)',
      agrovoc: 'c_6940 (seed treatment)',
    },
    {
      name: 'Land Preparation & Tillage',
      description: 'Pre-season field preparation and physical loosening of soil (including conventional tillage, disking, harrowing, or no-till).',
      agro: 'AGRO_01000015 (tillage)',
      agrovoc: 'c_330639 (field preparation); c_7771 (tillage)',
    },
    {
      name: 'Sowing / Planting / Transplanting',
      description: 'Planned operations for setting seeds, seedlings, or nursery stock into soil or a growing medium.',
      agro: 'AGRO_00000231 (planting process); AGRO_00000142 (seeding process); AGRO_00000229 (plant transplanting process)',
      agrovoc: 'c_7268 (sowing); c_5992 (planting); c_7873 (transplanting)',
    },
    {
      name: 'Irrigation & Water Management',
      description: 'Managing water on an agricultural field and artificially supplying water (other than rain) to sustain crops.',
      agro: 'AGRO_00000665 (water management process); AGRO_00000006 (irrigation process)',
      agrovoc: 'c_3954 (irrigation)',
    },
    {
      name: 'Inter-culture / Weeding / Thinning',
      description: 'Removing unwanted weeds or selectively thinning/pruning plants to reduce crowding and improve crop health and yield.',
      agro: 'AGRO_00020006 (weeding process); AGRO_00000027 (thinning)',
      agrovoc: 'c_8346 (weeding); c_3642 (hoeing); c_7729 (thinning)',
    },
    {
      name: 'Chemical / Bio Application (Spraying)',
      description: 'A pest control or planned fertilization process in which chemicals, organisms, or fertilizers are applied to manage unwanted organisms or promote plant growth.',
      agro: 'AGRO_00000024 (chemical pest control process); AGRO_00000022 (biological pest control process); AGRO_01000000 (agronomic fertilization process)',
      agrovoc: 'c_7334 (spraying)',
    },
    {
      name: 'Harvesting & Post-Harvest',
      description: 'Gathering useful crop parts at maturity and separating edible grain from chaff or straw (such as harvesting, threshing, and baling).',
      agro: 'AGRO_00000025 (harvest process); AGRO_00000454 (threshing process)',
      agrovoc: 'c_3500 (harvesting); c_7739 (threshing)',
    },
  ],

  Agri_Equipment: [
    {
      name: 'Technology / Diagnostic Tool',
      legacyLabel: 'Technology',
      description: 'Agricultural technology, information tools, sensors, and diagnostic devices such as weather stations.',
      agro: 'AGRO_00000357 (weather station)',
      agrovoc: 'c_7644 (technology); c_36660 (information technology)',
    },
    {
      name: 'Seeding & Residue Machinery',
      description: 'Implements used for planting, sowing, and managing crop residue (such as seed drills, planters, dibblers, and spreaders).',
      agro: 'AGRO_00000230 (planting implement); AGRO_00000232 (sowing implement); AGRO_00000225 (residue management implement)',
      agrovoc: 'c_25759 (planters); c_5991 (planting equipment); c_25753 (farm equipment)',
    },
    {
      name: 'Tillage & Trenching Implements',
      description: 'Implements used during soil tillage and land preparation (such as ploughs, harrows, cultivators, and bund formers).',
      agro: 'AGRO_00000223 (tillage implement)',
      agrovoc: 'c_25768 (tillage equipment); c_6022 (ploughs)',
    },
    {
      name: 'Harvesting Machinery',
      description: 'Machines and implements used to harvest crops (such as combine harvesters, mowers, balers, and binders).',
      agro: 'AGRO_00000234 (plant harvest implement)',
      agrovoc: 'c_3499 (harvesters)',
    },
    {
      name: 'Spraying & Bio-Release Devices',
      description: 'Devices that apply liquid sprays through nozzles or distribute fertilizers (such as backpack, boom, or airblast sprayers).',
      agro: 'AGRO_00000537 (sprayer); AGRO_00000227 (fertilization implement)',
      agrovoc: 'c_7333 (sprayers)',
    },
  ],

  Agri_Waste: [
    {
      name: 'Crop Residue / Straw / Stubble / Trash',
      description: 'Plant material remaining on the field after harvest — including stalks, leaves, straw, stubble, husks, and organic mulch.',
      agro: 'AGRO_00000154 (crop residue); ENVO_00003869 (straw); AGRO_00000098 (straw mulch)',
      agrovoc: 'c_16118 (crop residues); c_7441 (straw); c_16650 (stubble); c_4977 (mulches)',
    },
    {
      name: 'Organic Manure / Compost (FYM)',
      description: 'Decomposed animal manure, farmyard manure, compost, vermicompost, or organic fertilizers used to improve soil and supply nutrients.',
      agro: 'AGRO_00000079 (animal manure); ENVO_00002170 (compost); AGRO_00002039 (organic fertilizer)',
      agrovoc: 'c_2810 (farmyard manure); c_4592 (organic fertilizers); c_1795 (composts)',
    },
  ],

  Soil: [
    {
      name: 'Soil Texture',
      description: 'The relative proportions of clay, silt, and sand grains in soil and its physical structure or soil type.',
      agro: 'PECO_0007050 (soil texture exposure); ENVO_09200009 (structure of soil)',
      agrovoc: 'c_7199 (soil texture); c_7204 (soil types)',
    },
    {
      name: 'Soil Fertility / Nutrient Status',
      description: 'The ability of soil to sustain plant growth by providing essential nutrients and favourable chemical and biological conditions.',
      agro: 'ENVO_00003082 (enriched soil); ENVO_00001998 (soil)',
      agrovoc: 'c_7170 (soil fertility)',
    },
    {
      name: 'Soil Moisture / Drainage / Waterlogging',
      description: 'Soil water content, natural or artificial drainage of excess water, and waterlogging conditions near the soil surface.',
      agro: 'ENVO_09200015 (humidity of soil)',
      agrovoc: 'c_7205 (soil water); c_7208 (soil water content); c_2372 (drainage); c_8333 (waterlogging)',
    },
  ],

  Quantity: [
    {
      name: 'Application Rate / Dosage',
      description: 'Quantity of fertilizer, pesticide, or agricultural chemical applied per unit area or at a specified dosage frequency.',
      agro: 'PATO_0001351 (area density); UO_0000054 (area density unit)',
      agrovoc: 'c_16113 (application rates); c_36906 (dosage)',
    },
    {
      name: 'Mass / Weight',
      description: 'Measure of the amount of matter or weight of an object or harvest (e.g., grams, kilograms, quintals).',
      agro: 'PATO_0000125 (mass); UO_0000002 (mass unit)',
      agrovoc: 'c_4639 (mass)',
    },
    {
      name: 'Volume',
      description: 'Measure of the 3-dimensional space occupied by a liquid, solid, or gas (e.g., litres, millilitres, cubic meters).',
      agro: 'PATO_0000918 (volume); UO_0000095 (volume unit)',
      agrovoc: 'c_8288 (volume)',
    },
    {
      name: 'Concentration / Percentage / Ratio',
      description: 'Amount of a substance mixed with another substance or a dimensionless ratio expressed as a percentage.',
      agro: 'PATO_0000033 (concentration of); UO_0000051 (concentration unit); UO_0000187 (percent)',
      agrovoc: null,
    },
    {
      name: 'Field_Area',
      legacyLabel: 'Field_Area',
      description: 'Measurements of agricultural land or field area (e.g., acres, hectares, square meters).',
      agro: 'UO_0000047 (area unit); PATO_0001323 (area)',
      agrovoc: 'c_330588 (area); c_2894 (fields)',
    },
    {
      name: 'Length / Depth / Spacing',
      description: '1-D distance between two points, planting depth, or row-to-row and plant-to-plant spacing.',
      agro: 'PATO_0000122 (length); UO_0000001 (length unit)',
      agrovoc: 'c_4260 (length); c_7272 (spacing)',
    },
    {
      name: 'Other_Quantity (Counts / Thresholds)',
      legacyLabel: 'Other_Quantity',
      description: 'Dimensionless counts, economic thresholds, and general numeric measurements.',
      agro: 'UO_0000186 (dimensionless unit); UO_0000189 (count unit); PATO_0001555 (has number of)',
      agrovoc: 'c_24921 (economic thresholds); c_4668 (measurement)',
    },
    {
      name: 'Money / Price',
      legacyLabel: 'Money',
      description: 'Monetary values, input costs, market prices, subsidies, and currencies.',
      agro: null,
      agrovoc: 'c_6178 (prices); c_1922 (costs); c_28662 (currencies)',
    },
  ],

  Date_and_Time: [
    {
      name: 'Calendar Date / Fortnight / Month',
      description: 'Specific calendar dates, months, fortnights, or timing windows for sowing, irrigation, and harvesting.',
      agro: 'AGRO_00010126 (irrigation date); AGRO_00010128 (harvesting date); IAO_0000416 (time measurement datum)',
      agrovoc: 'c_16208 (sowing date); c_29464 (harvesting date); c_7779 (timing)',
    },
    {
      name: 'Duration / Interval / Crop Age',
      legacyLabel: 'Duration',
      description: 'Length of time, spray/irrigation intervals, or crop age in days, weeks, or months.',
      agro: 'PATO_0001309 (duration); UO_0000003 (time unit)',
      agrovoc: 'c_2412 (duration); c_7778 (time)',
    },
    {
      name: 'Season',
      legacyLabel: 'Season',
      description: 'Cropping or climatic seasons such as Kharif, Rabi, Zaid, winter, or monsoon.',
      agro: 'ENVO_03000096 (season); ENVO_03000129 (monsoon season)',
      agrovoc: 'c_6911 (seasons)',
    },
  ],

  Location: [
    {
      name: 'Administrative Region (Location)',
      description: 'Named administrative regions, states, districts, villages, or geographic features.',
      agro: 'ENVO_00000004 (administrative region); ENVO_00000000 (geographic feature)',
      agrovoc: null,
    },
    {
      name: 'Agro-Climatic / Topographic Zone',
      description: 'Environmental or agroclimatic zones sharing similar soil types, temperatures, rainfall patterns, and water availability.',
      agro: 'ENVO_01000408 (environmental zone)',
      agrovoc: 'c_28638 (agroclimatic zones)',
    },
  ],
};

/**
 * Ontology verification metadata for independent top-level entities (v3 Section 2).
 * These render as standalone single-click cards with no dropdown.
 */
export const INDEPENDENT_ENTITY_ONTOLOGY = {
  Organization: {
    agro: 'OBI_0000245 (organization)',
    agrovoc: 'c_37968 (organizations)',
  },
  Person: {
    agro: 'NCBITaxon_9606 (Homo sapiens); AGRO_00000372 (farmer)',
    agrovoc: 'c_2805 (farmers)',
  },
  Natural_Resource: {
    agro: null,
    agrovoc: 'c_5091 (natural resources)',
  },
};

/**
 * Filter strictly to subcategories verified in CGIAR AgrO and/or FAO AGROVOC
 * (v3: 53 AgrO + AGROVOC, 4 AgrO only, 2 AGROVOC only = 59 total),
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

/** Returns the subcategories for a parent entity, or []. */
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
  // Under Quantity
  'Field_Area',
  'Other_Quantity',
  'Money',
  // Under Date_and_Time
  'Duration',
  'Season',
]);
