const Course = require("../models/Course");
const Token = require("../models/Token");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { sendResetPasswordEmail, sendVerificationEmail } = require("../helpers");
const { generateToken } = require("../services/token.service");

//Email
const verifyEmail = async (req, res) => {
  const { courseEmail, verificationCode } = req.body;

  const course = await Course.findOne({ courseEmail });

  if (!course) {
    return res.status(400).json({ message: "Kullanıcı bulunamadı." });
  }

  if (course.verificationCode !== Number(verificationCode)) {
    return res.status(400).json({ message: "Doğrulama kodu yanlış." });
  }

  course.isVerified = true;
  course.verificationCode = "";
  await course.save();

  res.json({ message: "Hesap başarıyla doğrulandı." });
};

//Again Email
const againEmail = async (req, res) => {
  const { courseEmail } = req.body;

  const course = await Course.findOne({ courseEmail });

  if (!course) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const verificationCode = Math.floor(1000 + Math.random() * 9000);

  course.verificationCode = verificationCode;
  await course.save();

  await sendVerificationEmail({
    courseName: course.courseName,
    courseEmail: course.courseEmail,
    verificationCode: course.verificationCode,
  });
  res.json({ message: "Doğrulama kodu Gönderildi" });
};

//Register
const register = async (req, res, next) => {
  try {
    const { courseName,courseAdress,courseTel, courseEmail, password } = req.body;
    //check email
    const emailAlreadyExists = await Course.findOne({ courseEmail });
    if (emailAlreadyExists) {
      throw new CustomError.BadRequestError("Bu e-posta adresi zaten kayıtlı.");
    }

    //token create
    const verificationCode = Math.floor(1000 + Math.random() * 9000);

    const course = new Course({
      courseName,courseAdress,courseTel, courseEmail, password,
      verificationCode,
    });

    await course.save();

    const accessToken = await generateToken(
      { courseId: course._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { courseId: course._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/course/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    await sendVerificationEmail({
      courseName: course.courseName,
      courseEmail: course.courseEmail,
      verificationCode: course.verificationCode,
    });

    res.json({
      message:
        "Sürücü başarıyla oluşturuldu. Lütfen email adresini doğrulayın.",
        course: {
        _id: course._id,
        courseName: course.courseName,
        courseEmail: course.courseEmail,
        courseAdress: course.courseAdress,
        courseTel: course.courseTel,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Login
const login = async (req, res, next) => {
  try {
    const { courseEmail, password } = req.body;

    if (!courseEmail || !password) {
      throw new CustomError.BadRequestError(
        "Lütfen e-posta adresinizi ve şifrenizi girin"
      );
    }
    const course = await Course.findOne({ courseEmail });

    if (!course) {
      throw new CustomError.UnauthenticatedError(
        "Ne yazık ki böyle bir kullanıcı yok"
      );
    }
    const isPasswordCorrect = await course.comparePassword(password);

    if (!isPasswordCorrect) {
      throw new CustomError.UnauthenticatedError("Kayıtlı şifreniz yanlış!");
    }
    if (!course.isVerified) {
      throw new CustomError.UnauthenticatedError(
        "Lütfen e-postanızı doğrulayın !"
      );
    }

    const accessToken = await generateToken(
      { courseId: course._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { courseId: course._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/course/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    const token = new Token({
      refreshToken,
      accessToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      course: course._id,
    });

    await token.save();

    res.json({
      message: "Giriş Başarılı",
      course: {
        _id: course._id,
        courseName: course.courseName,
        courseEmail: course.courseEmail,
        courseAdress: course.courseAdress,
        courseTel: course.courseTel,
        subs: course.subs,
        status: course.status,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Get My Profile
const getMyProfile = async (req, res, next) => {
  const course = await Course.findById(req.course.courseId);

  res.status(200).json({
    success: true,
    course,
  });
};

//Logout
const logout = async (req, res, next) => {
  try {
    await Token.findOneAndDelete({ course: req.course.courseId });

    res.clearCookie("refreshtoken", { path: "/v1/course/refreshtoken" });

    res.json({
      message: "logged out !",
    });
  } catch (error) {
    next(error);
  }
};

//Forgot Password
const forgotPassword = async (req, res) => {
  const { courseEmail } = req.body;

  if (!courseEmail) {
    throw new CustomError.BadRequestError("Lütfen e-posta adresinizi girin.");
  }

  const course = await Course.findOne({ courseEmail });

  if (course) {
    const passwordToken = Math.floor(1000 + Math.random() * 9000);

    await sendResetPasswordEmail({
      courseName: course.courseName,
      courseEmail: course.courseEmail,
      passwordToken: passwordToken,
    });

    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

    course.passwordToken = passwordToken;
    course.passwordTokenExpirationDate = passwordTokenExpirationDate;

    await course.save();
  } else {
    throw new CustomError.BadRequestError("Kullanıcı bulunamadı.");
  }

  res.status(StatusCodes.OK).json({
    message: "Şifre sıfırlama bağlantısı için lütfen e-postanızı kontrol edin.",
  });
};

//Reset Password
const resetPassword = async (req, res) => {
  try {
    const { courseEmail, passwordToken, newPassword } = req.body;
    if (!passwordToken || !newPassword) {
      throw new CustomError.BadRequestError(
        "Lütfen sıfırlama kodunu ve yeni şifrenizi girin."
      );
    }
    const course = await Course.findOne({ courseEmail });

    if (course) {
      const currentDate = new Date();

      if (course.passwordToken === passwordToken) {
        if (currentDate > course.passwordTokenExpirationDate) {
          throw new CustomError.BadRequestError(
            "Kodunuz süresi doldu. Lütfen tekrar deneyin."
          );
        }
        course.password = newPassword;
        course.passwordToken = null;
        course.passwordTokenExpirationDate = null;
        await course.save();
        res.json({
          message: "Şifre başarıyla sıfırlandı.",
        });
      } else {
        res.status(400).json({
          message: "Geçersiz sıfırlama kodu.",
        });
      }
    } else {
      res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Sistem hatası oluştu. Lütfen tekrar deneyin.",
    });
  }
};

//Edit Profile
const editProfile = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      "courseName",
      "courseEmail",
      "password",
      "courseAdress",
      "courseTel",
      "courseCode",
    ];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return res
        .status(400)
        .send({ error: "Sistem hatası oluştu. Lütfen tekrar deneyin" });
    }

    const course = await Course.findById(req.course.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    if (req.body.courseEmail && req.body.courseEmail !== req.course.courseEmail) {
      updates.forEach((update) => (req.course[update] = req.body[update]));

      const verificationCode = Math.floor(1000 + Math.random() * 9000);
      course.verificationCode = verificationCode;
      course.isVerified = false;
      await course.save();

      await sendVerificationEmail({
        courseName: req.course.courseName,
        courseEmail: req.course.courseEmail,
        verificationCode: verificationCode,
      });
    }

    updates.forEach((update) => {
      if (req.body[update]) {
        course[update] = req.body[update];
      }
    });
    await course.save();

    res.json({
      message: "Profil başarıyla güncellendi.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Sistem hatası oluştu. Lütfen tekrar deneyin",
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMyProfile,
  againEmail,
  editProfile,
};
