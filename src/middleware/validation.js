const Joi = require('joi');

const validateReportId = (req, res, next) => {
  const schema = Joi.object({
    report_id: Joi.string().uuid().required()
  });

  const { error } = schema.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid report ID format'
    });
  }

  next();
};

module.exports = {
  validateReportId
};