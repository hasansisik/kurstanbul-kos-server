const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");

const isAuthenticated = async function (req, res, next) {
  if (!req.headers["authorization"])
    return next(createHttpError.Unauthorized());
  const bearerToken = req.headers["authorization"];
  const token = bearerToken.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
    if (err) {
      return next(createHttpError.Unauthorized());
    }
    req.company = payload;
    next();
  });
};

const isAdmin = async function (req, res, next) {
  if (req.company.role !== "admin") {
    return next(createHttpError.Unauthorized());
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin
};
