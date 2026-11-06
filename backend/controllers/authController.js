
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const {
  sendVerificationEmail,
} = require("../utils/sendEmail");

// =========================================================
// GENERATE JWT
// =========================================================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =========================================================
// GENERATE 6-DIGIT VERIFICATION CODE
// =========================================================

const generateVerificationCode = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};

// =========================================================
// REGISTER
// =========================================================

const register = async (req, res) => {
  const registerStartTime = Date.now();

  try {
    const { name, email, password } = req.body;

    // VALIDATION

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    console.log("REGISTER: Request received");

    // CHECK EXISTING USER

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    // EXISTING UNVERIFIED ACCOUNT

    if (existingUser) {
      if (!existingUser.isVerified) {
        const verificationCode = generateVerificationCode();

        existingUser.emailVerificationCode = verificationCode;

        existingUser.emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );

        await existingUser.save();

        console.log("REGISTER: Resending verification email");

        try {
          await sendVerificationEmail(
            existingUser.email,
            existingUser.name,
            verificationCode
          );
        } catch (emailError) {
          console.error(
            "RESEND EMAIL ERROR:",
            emailError.message
          );

          return res.status(500).json({
            message:
              "Account exists but verification email could not be sent. Please try again.",
          });
        }

        return res.status(200).json({
          message:
            "This email is already registered but not verified. A new verification code has been sent.",
          needsVerification: true,
          email: existingUser.email,
        });
      }

      return res.status(400).json({
        message: "Email already registered.",
      });
    }

    // HASH PASSWORD

    console.log("REGISTER: Hashing password");

    const hashedPassword = await bcrypt.hash(password, 10);

    // GENERATE VERIFICATION CODE

    const verificationCode = generateVerificationCode();

    const verificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    // CREATE USER

    console.log("REGISTER: Creating user");

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      isVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    // SEND VERIFICATION EMAIL

    console.log("REGISTER: Sending verification email");

    try {
      await sendVerificationEmail(
        user.email,
        user.name,
        verificationCode
      );
    } catch (emailError) {
      console.error(
        "VERIFICATION EMAIL ERROR:",
        emailError.message
      );

      // Delete the unverified account if email delivery fails.
      // This preserves the existing registration behavior.

      try {
        await User.findByIdAndDelete(user._id);
      } catch (deleteError) {
        console.error(
          "USER CLEANUP ERROR:",
          deleteError.message
        );
      }

      return res.status(500).json({
        message:
          "Account could not be created because the verification email could not be sent.",
      });
    }

    console.log(
      `REGISTER: Completed in ${Date.now() - registerStartTime} ms`
    );

    return res.status(201).json({
      message:
        "Registration successful. Please check your email for the 6-digit verification code.",
      needsVerification: true,
      email: user.email,
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
};

// =========================================================
// VERIFY EMAIL
// =========================================================

const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        message: "Verification code must be exactly 6 digits.",
      });
    }

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified.",
      });
    }

    if (!user.emailVerificationCode) {
      return res.status(400).json({
        message:
          "No verification code found. Please request a new code.",
      });
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({
        message:
          "Verification code has expired. Please request a new code.",
      });
    }

    if (user.emailVerificationCode !== cleanCode) {
      return res.status(400).json({
        message: "Invalid verification code.",
      });
    }

    user.isVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.status(200).json({
      message:
        "Email verified successfully. You can now log in.",
    });

  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify email.",
    });
  }
};

// =========================================================
// RESEND VERIFICATION EMAIL
// =========================================================

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email address is required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message:
          "This email is already verified. You can log in.",
        alreadyVerified: true,
      });
    }

    const verificationCode = generateVerificationCode();

    user.emailVerificationCode = verificationCode;

    user.emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await user.save();

    await sendVerificationEmail(
      user.email,
      user.name,
      verificationCode
    );

    return res.status(200).json({
      message: "A new 6-digit verification code has been sent.",
      email: user.email,
    });

  } catch (error) {
    console.error("RESEND VERIFICATION ERROR:", error);

    return res.status(500).json({
      message:
        "Unable to resend verification code. Please try again.",
    });
  }
};

// =========================================================
// LOGIN
// =========================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "Account is inactive.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        needsVerification: true,
        email: user.email,
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

// =========================================================
// GET CURRENT USER
// =========================================================

const getMe = async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.json({
      user,
    });

  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

// =========================================================
// CHANGE PASSWORD
// =========================================================

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message:
          "New password must be at least 6 characters.",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;

    await user.save();

    return res.json({
      message: "Password changed successfully.",
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Unable to change password.",
    });
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  changePassword,
};
