const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user-model");
const ErrorHandler = require("../middleware/errorHandlers");
const { catchAsyncError } = require("../middleware/catchAsyncError");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

module.exports.signUpWithGoogle = async (req, res) => {
  const token  =   req.headers.authorization?.split(" ")[1];


  try {
    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload.sub;
    const email = payload.email;
    const picture = payload.picture;
    const name = payload.name || "User";

    let user = await User.findOne({ googleId: userId });

    const isSubscribed = user ? user.isSubscribed : false;

    if (!user) {
      // Create a new user if not found
      user = new User({
        googleId: userId,
        email,
        name,
        createdAt: new Date(),
      });
      await user.save();
    }

    // Optionally create a JWT token or any session handling here
    const jwtToken = jwt.sign(
      {
        userId,
        name,
        email,
        picture,
      },
      process.env.SECRETKEY,
      { expiresIn: "7d" }
    );

    // Respond with user data and token
    res.status(200).json({
      user: { userId, email, picture, name, isSubscribed },
      token: jwtToken,
    });
  } catch (error) {
    console.error("Token verification or user handling failed:", error);
    res.status(401).send("Unauthorized");
  }
};

module.exports.whoami = catchAsyncError(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Retrieve token from Authorization header

  if (!token) {
    return next(new ErrorHandler("Token not found", 400));
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY);

    res.status(200).json({
      message: "User verified",
      user: decoded,
    });
  } catch (error) {
    res.status(401).json({
      message: "Token expired or invalid",
    });
  }
});

module.exports.logIn = catchAsyncError(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new ErrorHandler("username or password not passed", 400));
  }

  const user = await userModel.findOne({
    username: username,
  });

  if (!user) {
    return next(new ErrorHandler("Invalid credentials or user not found", 401));
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  const token = jwt.sign(
    {
      username: username,
    },
    process.env.SECRETKEY,
    {
      expiresIn: "14h",
    }
  );

  res.json({
    code: 200,
    message: "Login successful",
    token: token,
  });
});

module.exports.signUp = async (req, res, next) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return next(
      new ErrorHandler("username or password not passed or not validated", 400)
    );
  }

  const user = await userModel.findOne({
    username: username,
  });

  if (user) {
    return res
      .status(409)
      .json({ message: "username already exists", code: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const date = new Date();
  const newUser = new userModel({
    username: username,
    password: hashedPassword,
    name: name,
    createdAt: {
      string: date.toLocaleString(),
      timestamp: date.getTime(),
    },
  });

  const result = await newUser.save();

  if (result !== null) {
    res.json({
      code: 200,
      message: "User created",
      data: result,
    });
  } else {
    return next(new ErrorHandler("Failed to create user", 500));
  }
};

module.exports.logOut = catchAsyncError(async (req, res, next) => {
  try {
  } catch (error) {}
});

module.exports.changePassword = catchAsyncError(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new ErrorHandler("username or password not found", 400));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userModel.findOneAndUpdate(
    {
      username: username,
    },
    {
      password: hashedPassword,
    }
  );

  if (!user) {
    return next(new ErrorHandler("user password not updated", 400));
  }

  res.json({
    code: 200,
    status: "success",
    user: user,
  });
});
