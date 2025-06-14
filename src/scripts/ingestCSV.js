const fs = require('fs');
const path = require('path');
const csvIngestionService = require('../services/csvIngestionService');
const { sequelize } = require('../models');

async function ingestSampleData() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models
    await sequelize.sync({ force: true });
    console.log('Database models synchronized.');

    const sampleDir = path.join(__dirname, '../../sample-data');
    
    // Ensure sample directory exists
    fs.mkdirSync(sampleDir, { recursive: true });

    // Check for missing files
    const files = [
      'store_timezones.csv',
      'store_business_hours.csv',
      'store_status.csv'
    ];

    const missingFiles = files.filter(file => !fs.existsSync(path.join(sampleDir, file)));

    if (missingFiles.length > 0) {
      console.log('Missing some sample CSV files. Generating sample files...');
      await createSampleCSVFiles(sampleDir);
    } else {
      console.log('All sample CSV files found. Skipping generation.');
    }

    // Ingest data in correct foreign key dependency order
    const ingestionOrder = [
      { type: 'store_timezones', file: 'store_timezones.csv' },
      { type: 'store_business_hours', file: 'store_business_hours.csv' },
      { type: 'store_status', file: 'store_status.csv' }
    ];

    for (const { type, file } of ingestionOrder) {
      const filePath = path.join(sampleDir, file);
      console.log(`Ingesting ${file}...`);
      const count = await csvIngestionService.ingestCSV(type, filePath);
      console.log(`✓ Imported ${count} records from ${file}`);
    }

    console.log('✅ CSV ingestion completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ CSV ingestion failed:', error);
    process.exit(1);
  }
}

async function createSampleCSVFiles(sampleDir) {
  // Generate sample data
  const timezonesCSV = `store_id,timezone_str
store_001,America/New_York
store_002,America/Los_Angeles
store_003,America/Chicago`;

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

  // Write CSV files
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
