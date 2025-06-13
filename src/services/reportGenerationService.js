const moment = require('moment-timezone');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { StoreStatus, StoreBusinessHours, StoreTimezone, Report } = require('../models');
const { Op } = require('sequelize');

class ReportGenerationService {
  async generateReport(reportId) {
    try {
      console.log(`Starting report generation for ${reportId}`);
      
      // Get current timestamp from max timestamp in store status
      const maxTimestamp = await this.getCurrentTimestamp();
      console.log(`Using current timestamp: ${maxTimestamp}`);
      
      // Get all unique stores
      const stores = await this.getAllStores();
      console.log(`Processing ${stores.length} stores`);
      
      const reportData = [];
      
      for (const storeId of stores) {
        try {
          const storeReport = await this.generateStoreReport(storeId, maxTimestamp);
          reportData.push(storeReport);
        } catch (error) {
          console.error(`Error processing store ${storeId}:`, error);
          
        }
      }
      
      // Generate CSV file
      const filePath = await this.generateCSVFile(reportId, reportData);
      
      // Update report status
      await Report.update({
        status: 'Complete',
        file_path: filePath,
        completed_at: new Date()
      }, {
        where: { report_id: reportId }
      });
      
      console.log(`Report generation completed for ${reportId}`);
      
    } catch (error) {
      console.error(`Report generation failed for ${reportId}:`, error);
      
      // Update report status to failed
      await Report.update({
        status: 'Failed',
        error_message: error.message,
        completed_at: new Date()
      }, {
        where: { report_id: reportId }
      });
      
      throw error;
    }
  }

  async getCurrentTimestamp() {
    const result = await StoreStatus.findOne({
      attributes: [
        [StoreStatus.sequelize.fn('MAX', StoreStatus.sequelize.col('timestamp_utc')), 'max_timestamp']
      ]
    });
    
    return result?.dataValues?.max_timestamp || new Date();
  }

  async getAllStores() {
    const stores = await StoreStatus.findAll({
      attributes: ['store_id'],
      group: ['store_id']
    });
    
    return stores.map(store => store.store_id);
  }

  async generateStoreReport(storeId, currentTimestamp) {
    // Get store timezone
    const timezone = await this.getStoreTimezone(storeId);
    
    // Get business hours
    const businessHours = await this.getStoreBusinessHours(storeId);
    
    // Calculate uptime/downtime for different periods
    const lastHour = await this.calculateUpDowntime(storeId, currentTimestamp, 'hour', timezone, businessHours);
    const lastDay = await this.calculateUpDowntime(storeId, currentTimestamp, 'day', timezone, businessHours);
    const lastWeek = await this.calculateUpDowntime(storeId, currentTimestamp, 'week', timezone, businessHours);
    
    return {
      store_id: storeId,
      uptime_last_hour: Math.round(lastHour.uptime),
      uptime_last_day: Math.round(lastDay.uptime / 60), // Convert to hours
      uptime_last_week: Math.round(lastWeek.uptime / 60), // Convert to hours
      downtime_last_hour: Math.round(lastHour.downtime),
      downtime_last_day: Math.round(lastDay.downtime / 60), // Convert to hours
      downtime_last_week: Math.round(lastWeek.downtime / 60) // Convert to hours
    };
  }

  async getStoreTimezone(storeId) {
    const timezone = await StoreTimezone.findOne({
      where: { store_id: storeId }
    });
    
    return timezone?.timezone_str || 'America/Chicago';
  }

  async getStoreBusinessHours(storeId) {
    const hours = await StoreBusinessHours.findAll({
      where: { store_id: storeId },
      order: [['day_of_week', 'ASC']]
    });
    
    if (hours.length === 0) {
      // 24x7 operation
      return Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        start_time_local: '00:00:00',
        end_time_local: '23:59:59'
      }));
    }
    
    return hours.map(h => ({
      day_of_week: h.day_of_week,
      start_time_local: h.start_time_local,
      end_time_local: h.end_time_local
    }));
  }

  async calculateUpDowntime(storeId, currentTimestamp, period, timezone, businessHours) {
    // Calculate time range
    const currentMoment = moment.tz(currentTimestamp, timezone);
    let startTime;
    
    switch (period) {
      case 'hour':
        startTime = currentMoment.clone().subtract(1, 'hour');
        break;
      case 'day':
        startTime = currentMoment.clone().subtract(24, 'hours');
        break;
      case 'week':
        startTime = currentMoment.clone().subtract(7, 'days');
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }
    
    // Get status data for the period
    const statusData = await StoreStatus.findAll({
      where: {
        store_id: storeId,
        timestamp_utc: {
          [Op.between]: [startTime.utc().toDate(), currentMoment.utc().toDate()]
        }
      },
      order: [['timestamp_utc', 'ASC']]
    });
    
    if (statusData.length === 0) {
      // No data available, assume full downtime during business hours
      const businessMinutes = this.calculateBusinessMinutes(startTime, currentMoment, businessHours, timezone);
      return { uptime: 0, downtime: businessMinutes };
    }
    
    // Calculate uptime/downtime using interpolation
    return this.interpolateUpDowntime(statusData, startTime, currentMoment, businessHours, timezone);
  }

  calculateBusinessMinutes(startTime, endTime, businessHours, timezone) {
    let totalMinutes = 0;
    const current = startTime.clone();
    
    while (current.isBefore(endTime)) {
      const dayOfWeek = current.day() === 0 ? 6 : current.day() - 1; // Convert to 0=Monday format
      const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek);
      
      if (dayHours) {
        const dayStart = current.clone().startOf('day')
          .add(moment.duration(dayHours.start_time_local));
        const dayEnd = current.clone().startOf('day')
          .add(moment.duration(dayHours.end_time_local));
        
        // Handle case where end time is next day (crosses midnight)
        if (dayEnd.isBefore(dayStart)) {
          dayEnd.add(1, 'day');
        }
        
        const periodStart = moment.max(current, dayStart);
        const periodEnd = moment.min(endTime, dayEnd, current.clone().endOf('day'));
        
        if (periodStart.isBefore(periodEnd)) {
          totalMinutes += periodEnd.diff(periodStart, 'minutes');
        }
      }
      
      current.add(1, 'day').startOf('day');
    }
    
    return totalMinutes;
  }

  interpolateUpDowntime(statusData, startTime, endTime, businessHours, timezone) {
    let uptime = 0;
    let downtime = 0;
    
    // Add boundary points
    const points = [...statusData];
    
    // Add start point if needed
    if (points.length === 0 || moment(points[0].timestamp_utc).isAfter(startTime)) {
      points.unshift({
        timestamp_utc: startTime.utc().toDate(),
        status: 'inactive' // Assume inactive if no data
      });
    }
    
    // Process each consecutive pair of points
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      const segmentStart = moment.tz(current.timestamp_utc, timezone);
      const segmentEnd = moment.tz(next.timestamp_utc, timezone);
      
      const businessMinutes = this.calculateBusinessMinutes(segmentStart, segmentEnd, businessHours, timezone);
      
      if (current.status === 'active') {
        uptime += businessMinutes;
      } else {
        downtime += businessMinutes;
      }
    }
    
    // Handle the last segment (from last data point to end time)
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const lastSegmentStart = moment.tz(lastPoint.timestamp_utc, timezone);
      
      if (lastSegmentStart.isBefore(endTime)) {
        const businessMinutes = this.calculateBusinessMinutes(lastSegmentStart, endTime, businessHours, timezone);
        
        if (lastPoint.status === 'active') {
          uptime += businessMinutes;
        } else {
          downtime += businessMinutes;
        }
      }
    }
    
    return { uptime, downtime };
  }

  async generateCSVFile(reportId, data) {
    const reportsDir = process.env.REPORTS_DIR || './reports';
    const filePath = path.join(reportsDir, `${reportId}.csv`);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'store_id', title: 'store_id' },
        { id: 'uptime_last_hour', title: 'uptime_last_hour (in minutes)' },
        { id: 'uptime_last_day', title: 'uptime_last_day (in hours)' },
        { id: 'uptime_last_week', title: 'uptime_last_week (in hours)' },
        { id: 'downtime_last_hour', title: 'downtime_last_hour (in minutes)' },
        { id: 'downtime_last_day', title: 'downtime_last_day (in hours)' },
        { id: 'downtime_last_week', title: 'downtime_last_week (in hours)' }
      ]
    });
    
    await csvWriter.writeRecords(data);
    return filePath;
  }
}

module.exports = new ReportGenerationService();