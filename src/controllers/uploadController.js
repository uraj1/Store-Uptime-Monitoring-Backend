const csvIngestionService = require('../services/csvIngestionService');

class UploadController {
  async uploadCSV(req, res) {
    try {
      const files = req.files;
      
      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
          error: 'No CSV files uploaded'
        });
      }

      const results = {};

      // Process each uploaded file
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0];
          
          try {
            const count = await csvIngestionService.ingestCSV(fieldName, file.path);
            results[fieldName] = {
              status: 'success',
              records_imported: count
            };
          } catch (error) {
            console.error(`Error ingesting ${fieldName}:`, error);
            results[fieldName] = {
              status: 'error',
              error: error.message
            };
          }
        }
      }

      res.json({
        message: 'CSV files processed',
        results
      });

    } catch (error) {
      console.error('Error uploading CSV:', error);
      res.status(500).json({
        error: 'Failed to process CSV files'
      });
    }
  }
}

module.exports = new UploadController();