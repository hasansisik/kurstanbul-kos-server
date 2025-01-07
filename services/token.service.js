const { sign , verify } = require("../utils/token.util");
const secret = process.env.JWT_SECRET_KEY;


const generateToken = async (payload, expiresIn, secret) => {
  let token = await sign(payload, expiresIn, secret);
  return token;
};

const verifyToken = async (token, secret) => {
  let check = await verify(token, secret);
  return check;
};

module.exports = {
  generateToken,
  verifyToken
};


