// ============================================
// PSX Stock Logo Domains
// Maps PSX symbols to company website domains
// Used with Google's favicon service for logos
// ============================================

const STOCK_DOMAINS: Record<string, string> = {
  // Banks
  HBL: 'hbl.com',
  UBL: 'ubldirect.com',
  MCB: 'mcb.com.pk',
  NBP: 'nbp.com.pk',
  ABL: 'abl.com',
  BAFL: 'bankalfalah.com',
  MEBL: 'meezanbank.com',
  BAHL: 'bankalhabib.com',
  AKBL: 'askaribank.com.pk',
  BOP: 'bop.com.pk',
  JSBL: 'jsbl.com',
  SNBL: 'soneribank.com',
  SILK: 'silkbank.com.pk',
  FABL: 'faysalbank.com',
  BOK: 'bok.com.pk',

  // Oil & Gas
  OGDC: 'ogdcl.com',
  PPL: 'ppl.com.pk',
  PSO: 'psopk.com',
  MARI: 'marienergy.com.pk',
  BYCO: 'byco.com.pk',
  SSGC: 'ssgc.com.pk',
  HASCOL: 'hascol.com',

  // Power & Energy
  KEL: 'ke.com.pk',
  HUBC: 'hubpower.com',
  KAPCO: 'kapco.com.pk',

  // Cement
  LUCK: 'lucky-cement.com',
  DGKC: 'dgcement.com',
  CHCC: 'cherat.com',
  BWCL: 'bestway.com.pk',
  POWER: 'powercement.com',

  // Fertilizer
  FFC: 'ffc.com.pk',
  EFERT: 'engrofertilizers.com',
  FATIMA: 'fatima-group.com',

  // Pharma
  AGP: 'agp.com.pk',
  GLAXO: 'gsk.com.pk',
  ABOT: 'abbott.pk',

  // Tech / IT
  SYS: 'systemsltd.com',
  TRG: 'trgp.com',
  AVN: 'avanceon.com',
  NETSOL: 'netsoltech.com',

  // Conglomerates
  ENGRO: 'engro.com',
  EPCL: 'engropolymer.com',

  // FMCG / Consumer
  NESTLE: 'nestle.pk',
  UNITY: 'unityfoods.pk',

  // Textile
  NML: 'nishat.net',
  ILP: 'interloop.com',

  // Automobile
  INDU: 'honda.com.pk',
  PSMC: 'suzuki.com.pk',
  HCAR: 'honda.com.pk',

  // Insurance
  AICL: 'adamjee.com',

  // Steel
  INIL: 'international-industries.com',
  MUGHAL: 'mughalsteels.com',

  // Misc
  PIBTL: 'pibt.com.pk',
  LOTCHEM: 'lfrchemical.com',
  TREET: 'treet.com.pk',
};

/**
 * Get the favicon URL for a PSX stock symbol
 * Returns null if no domain mapping exists
 */
export function getStockLogoUrl(symbol: string): string | null {
  const domain = STOCK_DOMAINS[symbol.toUpperCase()];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
