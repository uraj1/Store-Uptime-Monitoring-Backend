const fs = require('fs');
const path = require('path');
const csvIngestionService = require('../services/csvIngestionService');
const { sequelize } = require('../models');

async function ingestSampleData() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models (clean database first)
    await sequelize.sync({ force: true });
    console.log('Database models synchronized.');

    const sampleDir = path.join(__dirname, '../../sample-data');
    
    if (!fs.existsSync(sampleDir)) {
      console.log('Sample data directory not found. Creating sample CSV files...');
      await createSampleCSVFiles(sampleDir);
    }

    // IMPORTANT: ingest files in correct dependency order
    const files = [
      { type: 'store_timezones', file: 'store_timezones.csv' },          // Parent first
      { type: 'store_business_hours', file: 'store_business_hours.csv' },
      { type: 'store_status', file: 'store_status.csv' }                 // Child last
    ];

    for (const { type, file } of files) {
      const filePath = path.join(sampleDir, file);
      
      if (fs.existsSync(filePath)) {
        console.log(`Ingesting ${file}...`);
        const count = await csvIngestionService.ingestCSV(type, filePath);
        console.log(`✓ Imported ${count} records from ${file}`);
      } else {
        console.log(`⚠ File ${file} not found, skipping...`);
      }
    }

    console.log('✅ CSV ingestion completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ CSV ingestion failed:', error);
    process.exit(1);
  }
}

async function createSampleCSVFiles(sampleDir) {
  fs.mkdirSync(sampleDir, { recursive: true });

  // Create sample timezone data FIRST
  const timezonesCSV = `store_id,timezone_str
store_001,America/New_York
store_002,America/Los_Angeles
store_003,America/Chicago`;

  // Create sample business hours data
  const businessHoursCSV = `store_id,dayOfWeek,start_time_local,end_time_local
store_001,0,09:00:00,21:00:00
store_001,1,09:00:00,21:00:00
store_001,2,09:00:00,21:00:00
store_001,3,09:00:00,21:00:00
store_001,4,09:00:00,21:00:00
store_001,5,09:00:00,22:00:00
store_001,6,10:00:00,22:00:00
store_002,0,08:00:00,20:00:00
store_002,1,08:00:00,20:00:00
store_002,2,08:00:00,20:00:00
store_002,3,08:00:00,20:00:00
store_002,4,08:00:00,20:00:00
store_002,5,08:00:00,21:00:00
store_002,6,09:00:00,21:00:00`;

  // Create sample store status data LAST
  const storeStatusCSV = `store_id,timestamp_utc,status
store_001,2023-01-25 12:00:00,active
store_001,2023-01-25 13:00:00,inactive
store_001,2023-01-25 14:00:00,active
store_001,2023-01-25 15:00:00,active
store_002,2023-01-25 12:00:00,active
store_002,2023-01-25 13:30:00,inactive
store_002,2023-01-25 14:30:00,active
store_003,2023-01-25 11:00:00,active
store_003,2023-01-25 12:30:00,active
store_003,2023-01-25 16:00:00,inactive`;

  // Write files
  fs.writeFileSync(path.join(sampleDir, 'store_timezones.csv'), timezonesCSV);
  fs.writeFileSync(path.join(sampleDir, 'store_business_hours.csv'), businessHoursCSV);
  fs.writeFileSync(path.join(sampleDir, 'store_status.csv'), storeStatusCSV);

  console.log('Sample CSV files created in:', sampleDir);
}

// Run if called directly
if (require.main === module) {
  ingestSampleData();
}

module.exports = { ingestSampleData };
