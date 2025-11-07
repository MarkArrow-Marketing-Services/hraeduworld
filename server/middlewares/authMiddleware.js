const jwt = require("jsonwebtoken");

// Middleware to authenticate token and authorize roles
const protect = (allowedRoles = []) => {
  return (req, res, next) => {
    let token;

    // Check if authorization header exists and starts with "Bearer "
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      try {
        // Get token from header
        token = req.headers.authorization.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = { id: decoded.id, role: decoded.role };

        // Check if user role is allowed
        if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
          return res
            .status(403)
            .json({ message: "Access Forbidden: Insufficient permissions" });
        }

        next();
      } catch (error) {
        return res
          .status(401)
          .json({ message: "Not authorized, token failed or expired" });
      }
    } else {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
  };
};

module.exports = { protect };
