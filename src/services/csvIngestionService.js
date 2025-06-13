const fs = require('fs');
const csv = require('csv-parser');
const { StoreStatus, StoreBusinessHours, StoreTimezone } = require('../models');

class CSVIngestionService {
  async ingestCSV(type, filePath) {
    const records = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          records.push(this.transformRecord(type, row));
        })
        .on('end', async () => {
          try {
            const count = await this.saveRecords(type, records);
            
            // Clean up uploaded file
            fs.unlinkSync(filePath);
            
            resolve(count);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  transformRecord(type, row) {
    switch (type) {
      case 'store_status':
        return {
          store_id: row.store_id?.toString(),
          timestamp_utc: new Date(row.timestamp_utc),
          status: row.status?.toLowerCase() === 'active' ? 'active' : 'inactive'
        };
      
      case 'store_business_hours':
        return {
          store_id: row.store_id?.toString(),
          day_of_week: parseInt(row.dayOfWeek || row.day_of_week || 0),
          start_time_local: row.start_time_local,
          end_time_local: row.end_time_local
        };
      
      case 'store_timezones':
        return {
          store_id: row.store_id?.toString(),
          timezone_str: row.timezone_str || 'America/Chicago'
        };
      
      default:
        throw new Error(`Unknown CSV type: ${type}`);
    }
  }

  async saveRecords(type, records) {
    const validRecords = records.filter(record => 
      record.store_id && record.store_id !== 'undefined'
    );

    switch (type) {
      case 'store_status':
        // Remove duplicates and bulk insert
        await StoreStatus.destroy({ where: {} });
        await StoreStatus.bulkCreate(validRecords, {
          ignoreDuplicates: true
        });
        break;
      
      case 'store_business_hours':
        await StoreBusinessHours.destroy({ where: {} });
        await StoreBusinessHours.bulkCreate(validRecords, {
          ignoreDuplicates: true
        });
        break;
      
      case 'store_timezones':
        await StoreTimezone.destroy({ where: {} });
        await StoreTimezone.bulkCreate(validRecords, {
          updateOnDuplicate: ['timezone_str']
        });
        break;
      
      default:
        throw new Error(`Unknown CSV type: ${type}`);
    }

    return validRecords.length;
  }
}

module.exports = new CSVIngestionService();