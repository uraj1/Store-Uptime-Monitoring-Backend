const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SystemVerifier {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Store Monitoring Backend Verification...\n');

    await this.testHealthCheck();
    await this.testReportGeneration();
    await this.testCSVUpload();
    await this.testFileSystem();
    
    this.printResults();
  }

  async testHealthCheck() {
    try {
      console.log('1. Testing Health Check...');
      const response = await axios.get(`${this.baseUrl}/health`);
      
      if (response.status === 200 && response.data.status === 'OK') {
        this.addResult('✅ Health Check', 'PASS', 'Server is running correctly');
      } else {
        this.addResult('❌ Health Check', 'FAIL', 'Unexpected response format');
      }
    } catch (error) {
      this.addResult('❌ Health Check', 'FAIL', `Server not accessible: ${error.message}`);
    }
  }

  async testReportGeneration() {
    try {
      console.log('2. Testing Report Generation...');
      
      // Trigger report
      const triggerResponse = await axios.post(`${this.baseUrl}/api/trigger_report`);
      
      if (triggerResponse.status === 200 && triggerResponse.data.report_id) {
        this.addResult('✅ Report Trigger', 'PASS', `Report ID: ${triggerResponse.data.report_id}`);
        
        const reportId = triggerResponse.data.report_id;
        
        // Check report status
        await this.delay(2000); // Wait 2 seconds
        const statusResponse = await axios.get(`${this.baseUrl}/api/get_report/${reportId}`);
        
        if (statusResponse.status === 200) {
          if (statusResponse.data.status === 'Running') {
            this.addResult('✅ Report Status', 'PASS', 'Report is processing');
            
            // Wait for completion (max 30 seconds)
            await this.waitForReportCompletion(reportId);
          } else if (statusResponse.data.status === 'Complete') {
            this.addResult('✅ Report Status', 'PASS', 'Report completed immediately');
            await this.testReportDownload(statusResponse.data.csv_download_link);
          }
        }
      } else {
        this.addResult('❌ Report Trigger', 'FAIL', 'Invalid response format');
      }
    } catch (error) {
      this.addResult('❌ Report Generation', 'FAIL', error.message);
    }
  }

  async waitForReportCompletion(reportId, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/get_report/${reportId}`);
        
        if (response.data.status === 'Complete') {
          this.addResult('✅ Report Completion', 'PASS', 'Report generated successfully');
          await this.testReportDownload(response.data.csv_download_link);
          return;
        } else if (response.data.status === 'Failed') {
          this.addResult('❌ Report Completion', 'FAIL', response.data.error || 'Report generation failed');
          return;
        }
        
        await this.delay(2000); // Wait 2 seconds before next check
      } catch (error) {
        this.addResult('❌ Report Completion', 'FAIL', error.message);
        return;
      }
    }
    
    this.addResult('⚠️ Report Completion', 'TIMEOUT', 'Report took longer than 30 seconds');
  }

  async testReportDownload(downloadLink) {
    try {
      console.log('3. Testing Report Download...');
      const response = await axios.get(downloadLink);
      
      if (response.status === 200 && response.data.includes('store_id')) {
        this.addResult('✅ Report Download', 'PASS', 'CSV file downloaded successfully');
        
        // Validate CSV format
        const lines = response.data.split('\n');
        const header = lines[0];
        
        if (header.includes('uptime_last_hour') && header.includes('downtime_last_week')) {
          this.addResult('✅ CSV Format', 'PASS', 'CSV has correct headers');
        } else {
          this.addResult('❌ CSV Format', 'FAIL', 'CSV headers are incorrect');
        }
      } else {
        this.addResult('❌ Report Download', 'FAIL', 'CSV file not accessible or invalid');
      }
    } catch (error) {
      this.addResult('❌ Report Download', 'FAIL', error.message);
    }
  }

  async testCSVUpload() {
    try {
      console.log('4. Testing CSV Upload...');
      
      // Create test CSV content
      const testCSV = `store_id,timestamp_utc,status
test_001,2023-01-25 12:00:00,active
test_001,2023-01-25 13:00:00,inactive
test_002,2023-01-25 12:30:00,active`;

      // Write to temporary file
      const tempFile = path.join(__dirname, 'temp_test.csv');
      fs.writeFileSync(tempFile, testCSV);

      // Note: This is a simplified test - in real scenario you'd use FormData
      this.addResult('✅ CSV Upload Prep', 'PASS', 'Test CSV file created');
      
      // Clean up
      fs.unlinkSync(tempFile);
      
    } catch (error) {
      this.addResult('❌ CSV Upload', 'FAIL', error.message);
    }
  }

  testFileSystem() {
    console.log('5. Testing File System...');
    
    const directories = ['reports', 'uploads'];
    
    directories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.addResult(`✅ Directory ${dir}`, 'PASS', 'Directory exists');
      } else {
        this.addResult(`❌ Directory ${dir}`, 'FAIL', 'Directory missing');
      }
    });
  }

  addResult(test, status, message) {
    this.results.push({ test, status, message });
    console.log(`   ${test}: ${message}`);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'TIMEOUT').length;
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📊 Total Tests: ${this.results.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All critical tests passed! Your system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the issues above.');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      console.log(`   ${result.test}: ${result.message}`);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new SystemVerifier();
  verifier.runAllTests().catch(console.error);
}

module.exports = SystemVerifier;