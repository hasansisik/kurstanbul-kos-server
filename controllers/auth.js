const User = require("../models/User");
const Token = require("../models/Token");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { sendResetPasswordEmail, sendVerificationEmail } = require("../helpers");
const { generateToken } = require("../services/token.service");

//Email
const verifyEmail = async (req, res) => {
  const { email, verificationCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "Kullanıcı bulunamadı." });
  }

  if (user.verificationCode !== Number(verificationCode)) {
    return res.status(400).json({ message: "Doğrulama kodu yanlış." });
  }

  user.isVerified = true;
  user.verificationCode = "";
  await user.save();

  res.json({ message: "Hesap başarıyla doğrulandı." });
};

//Again Email
const againEmail = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const verificationCode = Math.floor(1000 + Math.random() * 9000);

  user.verificationCode = verificationCode;
  await user.save();

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationCode: user.verificationCode,
  });
  res.json({ message: "Doğrulama kodu Gönderildi" });
};

//Register
const register = async (req, res, next) => {
  try {
    const { name, email, password, picture } = req.body;
    //check email
    const emailAlreadyExists = await User.findOne({ email });
    if (emailAlreadyExists) {
      throw new CustomError.BadRequestError("Bu e-posta adresi zaten kayıtlı.");
    }

    //token create
    const verificationCode = Math.floor(1000 + Math.random() * 9000);

    const user = new User({
      name,
      email,
      password,
      picture,
      verificationCode,
    });

    await user.save();

    const accessToken = await generateToken(
      { userId: user._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { userId: user._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/auth/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    await sendVerificationEmail({
      name: user.name,
      email: user.email,
      verificationCode: user.verificationCode,
    });

    res.json({
      message:
        "Kullanıcı başarıyla oluşturuldu. Lütfen email adresini doğrula.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
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
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError.BadRequestError(
        "Lütfen e-posta adresinizi ve şifrenizi girin"
      );
    }
    const user = await User.findOne({ email });

    if (!user) {
      throw new CustomError.UnauthenticatedError(
        "Ne yazık ki böyle bir kullanıcı yok"
      );
    }
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      throw new CustomError.UnauthenticatedError("Kayıtlı şifreniz yanlış!");
    }
    if (!user.isVerified) {
      throw new CustomError.UnauthenticatedError(
        "Lütfen e-postanızı doğrulayın !"
      );
    }

    const accessToken = await generateToken(
      { userId: user._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refreshToken = await generateToken(
      { userId: user._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/v1/auth/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    const token = new Token({
      refreshToken,
      accessToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      user: user._id,
    });

    await token.save();

    res.json({
      message: "login success.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        status: user.status,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Get My Profile
const getMyProfile = async (req, res, next) => {
  const user = await User.findById(req.user.userId);

  res.status(200).json({
    success: true,
    user,
  });
};

//Logout
const logout = async (req, res, next) => {
  try {
    await Token.findOneAndDelete({ user: req.user.userId });

    res.clearCookie("refreshtoken", { path: "/v1/auth/refreshtoken" });

    res.json({
      message: "logged out !",
    });
  } catch (error) {
    next(error);
  }
};

//Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new CustomError.BadRequestError("Lütfen e-posta adresinizi girin.");
  }

  const user = await User.findOne({ email });

  if (user) {
    const passwordToken = Math.floor(1000 + Math.random() * 9000);

    await sendResetPasswordEmail({
      name: user.name,
      email: user.email,
      passwordToken: passwordToken,
    });

    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

    user.passwordToken = passwordToken;
    user.passwordTokenExpirationDate = passwordTokenExpirationDate;

    await user.save();
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
    const { email, passwordToken, newPassword } = req.body;
    if (!passwordToken || !newPassword) {
      throw new CustomError.BadRequestError(
        "Lütfen sıfırlama kodunu ve yeni şifrenizi girin."
      );
    }
    const user = await User.findOne({ email });

    if (user) {
      const currentDate = new Date();

      if (user.passwordToken === passwordToken) {
        if (currentDate > user.passwordTokenExpirationDate) {
          throw new CustomError.BadRequestError(
            "Kodunuz süresi doldu. Lütfen tekrar deneyin."
          );
        }
        user.password = newPassword;
        user.passwordToken = null;
        user.passwordTokenExpirationDate = null;
        await user.save();
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
      "name",
      "email",
      "password",
      "address",
      "picture",
      "phoneNumber",
    ];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return res
        .status(400)
        .send({ error: "Sistem hatası oluştu. Lütfen tekrar deneyin" });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    if (req.body.email && req.body.email !== req.user.email) {
      updates.forEach((update) => (req.user[update] = req.body[update]));

      const verificationCode = Math.floor(1000 + Math.random() * 9000);
      user.verificationCode = verificationCode;
      user.isVerified = false;
      await user.save();

      await sendVerificationEmail({
        name: req.user.name,
        email: req.user.email,
        verificationCode: verificationCode,
      });
    }

    updates.forEach((update) => {
      if (req.body[update]) {
        user[update] = req.body[update];
      }
    });
    await user.save();

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
