#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseCsv } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the counties.geojson file
const geojsonPath = path.join(__dirname, 'counties.geojson');
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

// Filter for STATEFP = 01 and create a lookup map
const countyMap = {};
geojsonData.features.forEach(feature => {
  const properties = feature.properties;
  if (properties.STATEFP === '01') {
    const countyName = properties.NAME.toUpperCase();
    countyMap[countyName] = properties.GEOID;
  }
});

console.log(`Found ${Object.keys(countyMap).length} counties with STATEFP 01:`);
console.log(Object.keys(countyMap));

// Read the Alabama CSV
const alabamaCsvPath = path.join(__dirname, 'states', 'AL', 'AL_customers_served(in).csv');

try {
  const csvData = fs.readFileSync(alabamaCsvPath, 'utf-8');
  const records = parseCsv(csvData, {
    columns: true,
    skip_empty_lines: true
  });

  // Add FIPS column by matching county names
  const updatedRecords = records.map(record => {
    const countyName = record.county ? record.county.toUpperCase() : '';
    const fips = countyMap[countyName] || 'NOT_FOUND';
    
    return {
      ...record,
      FIPS: fips
    };
  });

  // Write the updated CSV back
  const output = stringify(updatedRecords, {
    header: true
  });

  fs.writeFileSync(alabamaCsvPath, output, 'utf-8');
  console.log(`\nSuccessfully updated ${alabamaCsvPath}`);
  console.log(`Processed ${updatedRecords.length} rows`);
  
  // Show a sample of matches
  console.log('\nSample of updated data:');
  updatedRecords.slice(0, 3).forEach(record => {
    console.log(`County: ${record.county} -> FIPS: ${record.FIPS}`);
  });

} catch (error) {
  console.error('Error processing CSV:', error.message);
  process.exit(1);
}
