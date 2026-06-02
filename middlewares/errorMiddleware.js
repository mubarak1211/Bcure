const ApiError = require('../utils/ApiError');

const handleCastErrorDB = (err) => {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.keyValue ? Object.values(err.keyValue)[0] : '';
    return new ApiError(400, `Duplicate field value: ${value}`);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new ApiError(400, `Invalid input data. ${errors.join('. ')}`);
};

const globalErrorHandler = (err, req, res, next) => {

    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

    res.status(error.statusCode || 500).json({
        status: error.status || 'error',
        message: error.message || 'Internal Server Error'
    });
};

module.exports = globalErrorHandler;