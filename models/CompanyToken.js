const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TokenSchema = new Schema(
  {
    refreshToken: { type: String, required: true },
    accessToken: { type: String, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    isValid: { type: Boolean, default: true },
    company: { type: mongoose.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

const Token = mongoose.model("Token", TokenSchema);

module.exports = Token;
