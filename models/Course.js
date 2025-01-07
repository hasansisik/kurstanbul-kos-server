const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validator = require("validator");
const bcrypt = require("bcrypt");

const CourseSchema = new Schema(
  {
    courseCode: { type: String, required: true },
    courseName: { type: String, required: true },
    courseEmail: {
      type: String,
      required: [true, "Please provide tour email address"],
      unqiue: [true, "This email address already exist"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    subs: {
      type: String,
      enum: ["basic", "premium","elite"],
      default: "elite",
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    courseAdress: {
      type: String,
      trim: true,
    },
    courseTel: {
      type: String,
      validate: {
        validator: function (v) {
          return /^(\+90|0)?5\d{9}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    verificationCode: { type: Number },
    isVerified: { type: Boolean, default: false },
    passwordToken: { type: Number },
    passwordTokenExpirationDate: { type: String },
  },
  { timestamps: true }
);

CourseSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

CourseSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

const Course = mongoose.model("Course", CourseSchema);

module.exports = Course;
