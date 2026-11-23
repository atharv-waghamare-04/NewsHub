function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.token || req.token.role !== requiredRole) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
        success: false,
      });
    }

    return next();
  };
}

module.exports = requireRole;
