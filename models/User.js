const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validator = require("validator");
const bcrypt = require("bcrypt");

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: [true, "Please provide tour email address"],
      unqiue: [true, "This email address already exist"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    address: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^(\+90|0)?5\d{9}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    picture: {
      type: String,
      default: "https://cdn-icons-png.freepik.com/512/8188/8188362.png",
    },
    verificationCode: { type: Number },
    isVerified: { type: Boolean, default: false },
    passwordToken: { type: Number },
    passwordTokenExpirationDate: { type: String },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
