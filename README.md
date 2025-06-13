# Restaurant Store Uptime Monitoring Backend

A comprehensive backend system for monitoring restaurant store uptime with CSV data ingestion, background report processing, and REST API endpoints.

## 🏗️ System Architecture

### Overview
This system processes store status data, business hours, and timezone information to generate uptime/downtime reports. It uses a microservices-like architecture with clear separation of concerns:

- **Data Layer**: PostgreSQL with Sequelize ORM
- **API Layer**: Express.js REST endpoints
- **Processing Layer**: Background job processing with Bull/Redis
- **Business Logic**: Service classes for calculations and data processing

### Key Components

1. **Models**: Database entities for stores, status, business hours, timezones, and reports
2. **Controllers**: Handle HTTP requests and responses
3. **Services**: Core business logic for CSV ingestion, report generation, and queue management
4. **Background Jobs**: Asynchronous report processing using Bull queue
5. **Middleware**: Validation, error handling, and security

### Data Flow

1. CSV files are uploaded via `/api/upload/csv` endpoint
2. Data is parsed and ingested into PostgreSQL tables
3. Reports are triggered via `/api/trigger_report` endpoint
4. Background jobs process reports asynchronously
5. Report status and download links are retrieved via `/api/get_report/:report_id`

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- Redis 6+ (optional, for background jobs)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis credentials
   ```

3. **Start PostgreSQL and Redis:**
   ```bash
   # PostgreSQL (varies by system)
   sudo service postgresql start
   
   # Redis (optional - system will fallback to in-memory processing)
   redis-server
   ```

4. **Initialize database with sample data:**
   ```bash
   npm run db:seed
   ```

5. **Start the application:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Base URL: `http://localhost:3000/api`

### 1. Trigger Report Generation
**POST** `/trigger_report`

Starts asynchronous report generation process.

**Response:**
```json
{
  "message": "Report generation started",
  "report_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Get Report Status
**GET** `/get_report/:report_id`

Retrieves report status and download link.

**Parameters:**
- `report_id`: UUID of the report

**Responses:**

*Processing:*
```json
{
  "status": "Running"
}
```

*Complete:*
```json
{
  "status": "Complete",
  "csv_download_link": "http://localhost:3000/reports/550e8400-e29b-41d4-a716-446655440000.csv"
}
```

*Failed:*
```json
{
  "status": "Failed",
  "error": "Error message"
}
```

### 3. Upload CSV Files
**POST** `/upload/csv`

Upload CSV files for data ingestion.

**Form Data:**
- `store_status`: Store status CSV file
- `store_business_hours`: Business hours CSV file  
- `store_timezones`: Timezone CSV file

**Response:**
```json
{
  "message": "CSV files processed",
  "results": {
    "store_status": {
      "status": "success",
      "records_imported": 1250
    }
  }
}
```

## 📊 CSV File Formats

### Store Status
```csv
store_id,timestamp_utc,status
store_001,2023-01-25 12:00:00,active
store_001,2023-01-25 13:00:00,inactive
```

### Store Business Hours
```csv
store_id,dayOfWeek,start_time_local,end_time_local
store_001,0,09:00:00,21:00:00
store_001,1,09:00:00,21:00:00
```
*Note: dayOfWeek: 0=Monday, 6=Sunday*

### Store Timezones
```csv
store_id,timezone_str
store_001,America/New_York
store_002,America/Los_Angeles
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | store_monitoring |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | password |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `PORT` | Server port | 3000 |
| `REPORTS_DIR` | Reports directory | ./reports |

## 📈 Report Generation Logic

### Calculation Windows
- **Last Hour**: 60 minutes from current timestamp
- **Last Day**: 24 hours from current timestamp  
- **Last Week**: 7 days from current timestamp

### Business Rules
1. **Current Timestamp**: Uses maximum timestamp from store status data
2. **Timezone Conversion**: All calculations in store's local timezone
3. **Business Hours Only**: Uptime/downtime calculated only during business hours
4. **Missing Data Handling**:
   - No business hours = 24/7 operation
   - No timezone = America/Chicago default
   - No status data = assumed downtime
5. **Interpolation**: Status assumed constant between polling points

### Output Format
```csv
store_id,uptime_last_hour (in minutes),uptime_last_day (in hours),uptime_last_week (in hours),downtime_last_hour (in minutes),downtime_last_day (in hours),downtime_last_week (in hours)
store_001,45,18.5,120.2,15,5.5,47.8
```

## 🛠️ Development

### Project Structure
```
src/
├── controllers/       # HTTP request handlers
├── models/           # Database models (Sequelize)
├── services/         # Business logic services  
├── routes/           # API route definitions
├── middleware/       # Custom middleware
├── scripts/          # Utility scripts
└── config/           # Configuration files
```

### Available Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm run db:migrate`: Run database migrations
- `npm run db:seed`: Seed database with sample data
- `npm test`: Run tests

### Testing
```bash
# Run all tests
npm test

# Test API endpoints manually
curl -X POST http://localhost:3000/api/trigger_report
curl http://localhost:3000/api/get_report/YOUR_REPORT_ID
```

## 🔄 Background Processing

The system uses Bull queue with Redis for reliable background job processing:

- **Queue Management**: Bull handles job persistence and retry logic
- **Concurrency**: Processes one report at a time to manage resource usage
- **Error Handling**: Failed jobs are retried with exponential backoff
- **Fallback**: In-memory processing if Redis unavailable

## 🚨 Error Handling

### Common Issues
1. **Database Connection**: Check PostgreSQL service and credentials
2. **Redis Connection**: Optional service, system falls back gracefully
3. **CSV Format**: Ensure proper headers and data types
4. **Memory Usage**: Large datasets may require pagination

### Monitoring
- Check server logs for detailed error messages
- Monitor `/health` endpoint for system status
- Review failed job logs in Bull dashboard (if enabled)

## 🔮 Future Improvements

### Performance Optimizations
- **Database Indexing**: Add composite indexes for frequently queried columns
- **Caching**: Implement Redis caching for timezone and business hours data
- **Streaming**: Use streaming for large CSV file processing
- **Pagination**: Add pagination for large report datasets

### Feature Enhancements
- **Real-time Updates**: WebSocket support for live report status
- **Historical Reports**: Archive and retrieve past reports
- **Dashboard**: Web interface for monitoring and management
- **Alerts**: Configurable downtime alerts and notifications

### Infrastructure
- **Docker**: Container support for easy deployment
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Load Balancing**: Multi-instance support with shared Redis
- **Cloud Storage**: S3 integration for report file storage

### Data Quality
- **Validation**: Enhanced CSV validation and error reporting
- **Deduplication**: Intelligent handling of duplicate records
- **Data Lineage**: Track data sources and transformations
- **Audit Logging**: Comprehensive audit trail for all operations

## 📝 Sample Report Output

```csv
store_id,uptime_last_hour (in minutes),uptime_last_day (in hours),uptime_last_week (in hours),downtime_last_hour (in minutes),downtime_last_day (in hours),downtime_last_week (in hours)
store_001,45,18,120,15,6,48
store_002,60,22,150,0,2,18
store_003,30,16,95,30,8,73
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Commit changes: `git commit -am 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.