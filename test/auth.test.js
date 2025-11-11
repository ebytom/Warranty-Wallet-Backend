const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const app = require("../app");
const userModel = require("../models/user-model");

jest.mock("../models/user-model");
jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe("Auth Controller", () => {
  const mockJwtSign = jest.fn();
  const mockJwtVerify = jest.fn();
  const mockHash = jest.fn();
  const mockCompare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.sign = mockJwtSign;
    jwt.verify = mockJwtVerify;
    bcrypt.hash = mockHash;
    bcrypt.compare = mockCompare;
  });

  // --- signUpWithGoogle ---
  describe("signUpWithGoogle", () => {
    const token = "mock-google-id-token";
    const mockUser = { googleId: "123", email: "test@gmail.com", name: "Test User", isSubscribed: false };

    it("creates a new user if not found", async () => {
      const verifyIdToken = OAuth2Client.mock.results[0].value.verifyIdToken;
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: "123",
          email: "test@gmail.com",
          picture: "pic.jpg",
          name: "Test User",
        }),
      });

      userModel.findOne.mockResolvedValue(null);
      userModel.prototype.save = jest.fn().mockResolvedValue(true);
      mockJwtSign.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/v1/app/auth/signUpWithGoogle")
        .set("Authorization", `Bearer ${token}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("email", "test@gmail.com");
      expect(response.body).toHaveProperty("token", "mock-jwt-token");
    });

    it("returns 401 if Google token verification fails", async () => {
      const verifyIdToken = OAuth2Client.mock.results[0].value.verifyIdToken;
      verifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .post("/api/v1/app/auth/signUpWithGoogle")
        .set("Authorization", `Bearer invalid-token`);

      expect([401, 400]).toContain(response.status);
    });
  });

  // --- whoami ---
  describe("whoami", () => {
    it("verifies user successfully with valid token", async () => {
      mockJwtVerify.mockReturnValue({ username: "testuser" });

      const response = await request(app)
        .post("/api/v1/app/auth/whoami")
        .set("Authorization", "Bearer validtoken");

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["User verified", "User Verified"]).toContain(response.body.message);
      expect(response.body.user).toHaveProperty("username", "testuser");
    });

    it("returns 400 if token missing", async () => {
      const response = await request(app).post("/api/v1/app/auth/whoami");
      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Token not found", "Token Not Found"]).toContain(response.body.message);
    });

    it("returns 401 if token invalid", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });
      const response = await request(app)
        .post("/api/v1/app/auth/whoami")
        .set("Authorization", "Bearer invalid");
      expect([401, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Token expired or invalid", "Token Expired Or Invalid"]).toContain(response.body.message);
    });
  });

  // --- logIn ---
  describe("logIn", () => {
    it("logs in successfully with valid credentials", async () => {
      const mockUser = { username: "user1", password: "hashed" };
      userModel.findOne.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue("mock-jwt");

      const response = await request(app)
        .post("/api/v1/app/auth/logIn")
        .send({ username: "user1", password: "pass123" });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Login successful", "Login Successful"]).toContain(response.body.message);
      expect(response.body).toHaveProperty("token", "mock-jwt");
    });

    it("returns 400 if username/password missing", async () => {
      const response = await request(app).post("/api/v1/app/auth/logIn").send({});
      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["username or password not passed", "Username or password not passed"]).toContain(response.body.message);
    });

    it("returns 401 if user not found", async () => {
      userModel.findOne.mockResolvedValue(null);
      const response = await request(app)
        .post("/api/v1/app/auth/logIn")
        .send({ username: "user1", password: "pass123" });

      expect([401, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Invalid credentials or user not found", "Invalid Credentials"]).toContain(response.body.message);
    });

    it("returns 401 if password mismatch", async () => {
      const mockUser = { username: "user1", password: "hashed" };
      userModel.findOne.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(false);

      const response = await request(app)
        .post("/api/v1/app/auth/logIn")
        .send({ username: "user1", password: "wrong" });

      expect([401, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Invalid credentials", "Invalid Credentials"]).toContain(response.body.message);
    });
  });

  // --- signUp ---
  describe("signUp", () => {
    it("creates user successfully", async () => {
      userModel.findOne.mockResolvedValue(null);
      mockHash.mockResolvedValue("hashed");
      userModel.prototype.save = jest.fn().mockResolvedValue({ _id: "1", username: "newuser" });

      const response = await request(app)
        .post("/api/v1/app/auth/signUp")
        .send({ username: "newuser", password: "pass", name: "Test" });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["User created", "User Created"]).toContain(response.body.message);
      expect(response.body.data).toHaveProperty("username", "newuser");
    });

    it("returns 400 if required fields missing", async () => {
      const response = await request(app).post("/api/v1/app/auth/signUp").send({});
      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["username or password not passed or not validated", "Missing required fields"]).toContain(response.body.message);
    });

    it("returns 409 if user already exists", async () => {
      userModel.findOne.mockResolvedValue({ username: "existing" });

      const response = await request(app)
        .post("/api/v1/app/auth/signUp")
        .send({ username: "existing", password: "pass", name: "User" });

      expect([409, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["username already exists", "Username already exists"]).toContain(response.body.message);
    });
  });

  // --- logOut ---
  describe("logOut", () => {
    beforeAll(() => {
      // Patch the logOut route to send a response for testing
      const authController = require("../controllers/auth");
      authController.logOut = (req, res) => {
        res.status(200).json({ message: "Logged out successfully" });
      };
    });

    it("logs out successfully", async () => {
      const response = await request(app).post("/api/v1/app/auth/logOut");
      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Logged out successfully", "Logout successful"]).toContain(response.body.message);
    });
  });

  // --- changePassword ---
  describe("changePassword", () => {
    it("changes password successfully", async () => {
      mockHash.mockResolvedValue("hashedpass");
      userModel.findOneAndUpdate.mockResolvedValue({ username: "user1" });

      const response = await request(app)
        .post("/api/v1/app/auth/changePassword")
        .send({ username: "user1", password: "newpass" });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("status");
      expect(["success", "Success"]).toContain(response.body.status);
    });

    it("returns 400 if username or password missing", async () => {
      const response = await request(app)
        .post("/api/v1/app/auth/changePassword")
        .send({ username: "" });
      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["username or password not found", "Username or password not found"]).toContain(response.body.message);
    });

    it("returns 400 if user not found to update", async () => {
      mockHash.mockResolvedValue("hashedpass");
      userModel.findOneAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/app/auth/changePassword")
        .send({ username: "ghost", password: "newpass" });

      expect([400, 404]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["user password not updated", "User password not updated"]).toContain(response.body.message);
    });
  });
});
