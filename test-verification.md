# Store Monitoring Backend - Verification Guide

## 🚀 Quick Start Verification

### 1. Start the Application
```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

### 2. Verify Server is Running
The server should start on port 3000 and show:
```
Database connection established successfully.
Database models synchronized.
Background queue initialized.
Server running on port 3000
Health check: http://localhost:3000/health
API base URL: http://localhost:3000/api
```

### 3. Test Health Check
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-25T10:30:00.000Z"
}
```

## 📊 Database Verification

### 1. Seed Sample Data
```bash
npm run db:seed
```
This should show:
```
Database connection established.
Database models synchronized.
Sample CSV files created in: /path/to/sample-data
Ingesting store_status.csv...
✓ Imported 10 records from store_status.csv
Ingesting store_business_hours.csv...
✓ Imported 14 records from store_business_hours.csv
Ingesting store_timezones.csv...
✓ Imported 3 records from store_timezones.csv
✅ CSV ingestion completed successfully!
```

## 🧪 API Testing

### 1. Test Report Generation
```bash
# Trigger a new report
curl -X POST http://localhost:3000/api/trigger_report \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "message": "Report generation started",
  "report_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Check Report Status
```bash
# Replace REPORT_ID with the actual ID from step 1
curl http://localhost:3000/api/get_report/REPORT_ID
```

**While processing:**
```json
{
  "status": "Running"
}
```

**When complete:**
```json
{
  "status": "Complete",
  "csv_download_link": "http://localhost:3000/reports/REPORT_ID.csv"
}
```

### 3. Download Generated Report
```bash
# Download the CSV file
curl -o report.csv "http://localhost:3000/reports/REPORT_ID.csv"

# View the report content
cat report.csv
```

Expected CSV format:
```csv
store_id,uptime_last_hour (in minutes),uptime_last_day (in hours),uptime_last_week (in hours),downtime_last_hour (in minutes),downtime_last_day (in hours),downtime_last_week (in hours)
store_001,45,18,120,15,6,48
store_002,60,22,150,0,2,18
store_003,30,16,95,30,8,73
```

## 📁 CSV Upload Testing

### 1. Test CSV File Upload
```bash
# Create test CSV files (if sample-data doesn't exist)
mkdir -p test-uploads

# Create a test store status file
cat > test-uploads/store_status.csv << EOF
store_id,timestamp_utc,status
test_001,2023-01-25 12:00:00,active
test_001,2023-01-25 13:00:00,inactive
test_002,2023-01-25 12:30:00,active
EOF

# Upload the CSV file
curl -X POST http://localhost:3000/api/upload/csv \
  -F "store_status=@test-uploads/store_status.csv"
```

Expected response:
```json
{
  "message": "CSV files processed",
  "results": {
    "store_status": {
      "status": "success",
      "records_imported": 3
    }
  }
}
```

## 🔍 Detailed Verification Steps

### 1. Database Connection Test
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Connect to database (optional)
psql -h localhost -p 5432 -U postgres -d store_monitoring
```

### 2. Redis Connection Test (Optional)
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### 3. File System Verification
```bash
# Check if directories are created
ls -la reports/
ls -la uploads/
ls -la sample-data/

# Check generated report files
ls -la reports/*.csv
```

## 🐛 Troubleshooting Common Issues

### Database Connection Issues
```bash
# Check PostgreSQL service
sudo service postgresql status

# Start PostgreSQL if not running
sudo service postgresql start

# Check database exists
psql -h localhost -p 5432 -U postgres -l | grep store_monitoring
```

### Redis Connection Issues
```bash
# Check Redis service
redis-cli ping

# Start Redis if not running
redis-server

# Note: Redis is optional - system will fallback to in-memory processing
```

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process if needed
kill -9 PID
```

### Permission Issues
```bash
# Fix directory permissions
chmod 755 reports/ uploads/ sample-data/
```

## 📈 Performance Testing

### 1. Load Testing with Multiple Reports
```bash
# Generate multiple reports simultaneously
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/trigger_report &
done
wait
```

### 2. Large CSV Upload Test
```bash
# Create a larger test file
python3 -c "
import csv
import datetime
import random

with open('large_test.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['store_id', 'timestamp_utc', 'status'])
    
    for i in range(1000):
        store_id = f'store_{i:03d}'
        timestamp = datetime.datetime.now() - datetime.timedelta(hours=random.randint(1, 168))
        status = random.choice(['active', 'inactive'])
        writer.writerow([store_id, timestamp.strftime('%Y-%m-%d %H:%M:%S'), status])
"

# Upload large file
curl -X POST http://localhost:3000/api/upload/csv \
  -F "store_status=@large_test.csv"
```

## ✅ Success Criteria

Your system is working correctly if:

1. ✅ Server starts without errors
2. ✅ Health check returns 200 OK
3. ✅ Database connection is established
4. ✅ Sample data ingestion completes successfully
5. ✅ Report generation API returns valid UUID
6. ✅ Report status API shows "Running" then "Complete"
7. ✅ Generated CSV file is downloadable and properly formatted
8. ✅ CSV upload API processes files successfully
9. ✅ Background jobs process without errors
10. ✅ All directories (reports/, uploads/) are created

## 🔧 Advanced Verification

### 1. Database Schema Verification
```sql
-- Connect to PostgreSQL and run:
\c store_monitoring
\dt

-- Should show tables: reports, store_business_hours, store_status, store_timezones

-- Check sample data
SELECT COUNT(*) FROM store_status;
SELECT COUNT(*) FROM store_business_hours;
SELECT COUNT(*) FROM store_timezones;
SELECT COUNT(*) FROM reports;
```

### 2. Log Analysis
```bash
# Check server logs for errors
tail -f logs/app.log  # if logging to file
# or check console output for any error messages
```

### 3. API Response Time Testing
```bash
# Test API response times
time curl -X POST http://localhost:3000/api/trigger_report
time curl http://localhost:3000/api/get_report/REPORT_ID
```

## 📊 Expected Sample Output

When everything is working correctly, your generated report should look like:

```csv
store_id,uptime_last_hour (in minutes),uptime_last_day (in hours),uptime_last_week (in hours),downtime_last_hour (in minutes),downtime_last_day (in hours),downtime_last_week (in hours)
store_001,45,18,120,15,6,48
store_002,60,22,150,0,2,18
store_003,30,16,95,30,8,73
```

The numbers will vary based on your sample data and the current timestamp used for calculations.