const Company = require("../models/Company");
const Token = require("../models/CompanyToken");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { sendResetPasswordEmail, sendVerificationEmail } = require("../helpers");
const { generateToken } = require("../services/token.service");

//Email
const verifyEmail = async (req, res) => {
  const { courseEmail, verificationCode } = req.body;

  const company = await Company.findOne({ courseEmail });

  if (!company) {
    return res.status(400).json({ message: "Kullanıcı bulunamadı." });
  }

  if (company.verificationCode !== Number(verificationCode)) {
    return res.status(400).json({ message: "Doğrulama kodu yanlış." });
  }

  company.isVerified = true;
  company.verificationCode = "";
  await company.save();

  res.json({ message: "Hesap başarıyla doğrulandı." });
};

//Again Email
const againEmail = async (req, res) => {
  const { courseEmail } = req.body;

  const company = await Company.findOne({ courseEmail });

  if (!company) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const verificationCode = Math.floor(1000 + Math.random() * 9000);

  company.verificationCode = verificationCode;
  await company.save();

  await sendVerificationEmail({
    courseName: company.courseName,
    courseEmail: company.courseEmail,
    verificationCode: company.verificationCode,
  });
  res.json({ message: "Doğrulama kodu Gönderildi" });
};

//Register
const register = async (req, res, next) => {
  try {
    const { courseName,courseAdress,courseTel, courseEmail, password,courseCode } = req.body;
    //check email
    const emailAlreadyExists = await Company.findOne({ courseEmail });
    if (emailAlreadyExists) {
      throw new CustomError.BadRequestError("Bu e-posta adresi zaten kayıtlı.");
    }

    //token create
    const verificationCode = Math.floor(1000 + Math.random() * 9000);

    const company = new Company({
      courseName,courseAdress,courseTel, courseEmail, password,courseCode,
      verificationCode,
    });

    await company.save();

    const accessToken = await generateToken(
      { courseId: company._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { courseId: company._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/company/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    await sendVerificationEmail({
      courseName: company.courseName,
      courseEmail: company.courseEmail,
      verificationCode: company.verificationCode,
    });

    res.json({
      message:
        "Sürücü başarıyla oluşturuldu. Lütfen email adresini doğrulayın.",
        company: {
        _id: company._id,
        courseName: company.courseName,
        courseEmail: company.courseEmail,
        courseAdress: company.courseAdress,
        courseCode: company.courseCode,
        courseTel: company.courseTel,
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
    const company = await Company.findOne({ courseEmail });

    if (!company) {
      throw new CustomError.UnauthenticatedError(
        "Ne yazık ki böyle bir kullanıcı yok"
      );
    }
    const isPasswordCorrect = await company.comparePassword(password);

    if (!isPasswordCorrect) {
      throw new CustomError.UnauthenticatedError("Kayıtlı şifreniz yanlış!");
    }
    if (!company.isVerified) {
      throw new CustomError.UnauthenticatedError(
        "Lütfen e-postanızı doğrulayın !"
      );
    }

    const accessToken = await generateToken(
      { courseId: company._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { courseId: company._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/company/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    const token = new Token({
      refreshToken,
      accessToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      company: company._id,
    });

    await token.save();

    res.json({
      message: "Giriş Başarılı",
      company: {
        _id: company._id,
        courseName: company.courseName,
        courseEmail: company.courseEmail,
        courseAdress: company.courseAdress,
        courseTel: company.courseTel,
        subs: company.subs,
        status: company.status,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Get My Profile
const getMyProfile = async (req, res, next) => {
  const company = await Company.findById(req.company.courseId);

  res.status(200).json({
    success: true,
    company,
  });
};

//Logout
const logout = async (req, res, next) => {
  try {
    await Token.findOneAndDelete({ company: req.company.courseId });

    res.clearCookie("refreshtoken", { path: "/v1/company/refreshtoken" });

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
  console.log(courseEmail);

  if (!courseEmail) {
    throw new CustomError.BadRequestError("Lütfen e-posta adresinizi girin.");
  }

  const company = await Company.findOne({ courseEmail });

  if (company) {
    const passwordToken = Math.floor(1000 + Math.random() * 9000);

    await sendResetPasswordEmail({
      courseName: company.courseName,
      courseEmail: company.courseEmail,
      passwordToken: passwordToken,
    });

    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

    company.passwordToken = passwordToken;
    company.passwordTokenExpirationDate = passwordTokenExpirationDate;

    await company.save();
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
    const company = await Company.findOne({ courseEmail });

    if (company) {
      const currentDate = new Date();

      if (company.passwordToken === passwordToken) {
        if (currentDate > company.passwordTokenExpirationDate) {
          throw new CustomError.BadRequestError(
            "Kodunuz süresi doldu. Lütfen tekrar deneyin."
          );
        }
        company.password = newPassword;
        company.passwordToken = null;
        company.passwordTokenExpirationDate = null;
        await company.save();
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

    const company = await Company.findById(req.company.courseId);

    if (!company) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    if (req.body.courseEmail && req.body.courseEmail !== req.company.courseEmail) {
      updates.forEach((update) => (req.company[update] = req.body[update]));

      const verificationCode = Math.floor(1000 + Math.random() * 9000);
      company.verificationCode = verificationCode;
      company.isVerified = false;
      await company.save();

      await sendVerificationEmail({
        courseName: req.company.courseName,
        courseEmail: req.company.courseEmail,
        verificationCode: verificationCode,
      });
    }

    updates.forEach((update) => {
      if (req.body[update]) {
        company[update] = req.body[update];
      }
    });
    await company.save();

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
