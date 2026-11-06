const jwt = require("jsonwebtoken");

const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token means guest checkout.
    if (!authHeader) {
      req.user = null;
      return next();
    }

    // If a token is supplied, it must be valid.
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId =
      decoded._id ||
      decoded.id ||
      decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      ...decoded,
      _id: userId,
      id: decoded.id || userId,
      userId: decoded.userId || userId,
    };

    next();
  } catch (error) {
    console.error("OPTIONAL AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Your session has expired. Please login again."
          : "Invalid authentication token.",
    });
  }
};

module.exports = optionalAuthMiddleware;