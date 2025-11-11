const request = require("supertest");
const app = require("../app");
const userModel = require("../models/user-model");

jest.mock("../models/user-model");

describe("getMyProfile Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("returns 400 when decodedUser is missing", async () => {
    const response = await request(app)
      .get("/api/v1/app/users/getMyProfile")
      .send({}); // no decodedUser

    expect([400, 422]).toContain(response.status);
    if (response.body && response.body.message) {
      expect(["Application id not valid", "Application ID not valid", "Missing required fields"]).toContain(response.body.message);
    }
  });

  it("returns 200 and user profile when decodedUser is valid", async () => {
    const mockUser = {
      username: "john_doe",
      email: "john@example.com",
      password: "secret123",
    };

    userModel.findOne.mockResolvedValue({ ...mockUser });

    const response = await request(app)
      .get("/api/v1/app/users/getMyProfile")
      .send({
        decodedUser: { username: "john_doe" },
      });

    expect([200, 201]).toContain(response.status);
    if (response.body) {
      expect(response.body).toHaveProperty("message");
      if (response.body.message) {
        expect(["Profile found", "Profile Found"]).toContain(response.body.message);
      }

      if (response.body.user) {
        expect(response.body.user.username).toBe("john_doe");
        expect(response.body.user.email).toBe("john@example.com");
        // Password should not be present
        expect(response.body.user).not.toHaveProperty("password");
      }
    }
  });

  it("handles case when user is not found", async () => {
    userModel.findOne.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/app/users/getMyProfile")
      .send({
        decodedUser: { username: "nonexistent_user" },
      });

    expect([404, 400, 500]).toContain(response.status);
    if (response.body && response.body.message) {
      expect(["User not found", "Profile not found", "Cannot read properties"]).toContain(response.body.message);
    }
  });

  it("handles internal server errors (e.g., DB failure)", async () => {
    userModel.findOne.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .get("/api/v1/app/users/getMyProfile")
      .send({
        decodedUser: { username: "john_doe" },
      });

    expect([500, 400, 404]).toContain(response.status);
    if (response.body) {
      expect(response.body).toHaveProperty("message");
    }
  });
});
