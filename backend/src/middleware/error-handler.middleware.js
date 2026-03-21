const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  console.error(`[ERROR] ${statusCode} — ${message}`);

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
