/**
 * ICD-10 code -> human label, for the "Top diagnoses" table.
 * The API returns codes (that's what's stored in `visits.diagnosis_code`); the
 * UI maps them to readable names. Mirrors the set used in the seed generator.
 */

export const DIAGNOSIS_LABELS = {
  'E11.9': 'Type 2 diabetes mellitus',
  I10: 'Essential hypertension',
  'J45.909': 'Asthma, unspecified',
  'M54.5': 'Low back pain',
  'K21.9': 'GERD',
  'F41.9': 'Anxiety disorder',
  'J06.9': 'Acute upper respiratory infection',
  'N39.0': 'Urinary tract infection',
  R51: 'Headache',
  'E78.5': 'Hyperlipidemia',
  'I25.10': 'Atherosclerotic heart disease',
  'G43.909': 'Migraine',
  'L30.9': 'Dermatitis',
  'C50.911': 'Malignant neoplasm of breast',
  'S93.401': 'Sprained ankle',
};

export const diagnosisLabel = (code) => DIAGNOSIS_LABELS[code] || 'Unknown';
