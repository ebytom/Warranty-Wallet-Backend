const request = require("supertest");
const app = require("../app");
const userModel = require("../models/user-model");

describe("Admin Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("getAlluser", () => {
    it("fetches all users successfully", async () => {
      const mockUsers = [
        { username: "user1", email: "user1@example.com" },
        { username: "user2", email: "user2@example.com" },
      ];
      jest.spyOn(userModel, "find").mockResolvedValue(mockUsers);

      const response = await request(app).get("/api/v1/admin/getAlluser");

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["All user", "All User"]).toContain(response.body.message);
      expect(response.body).toHaveProperty("users");
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBe(2);
      expect(response.body.users).toMatchObject(mockUsers);
    });

    it("returns 500 if fetching users fails", async () => {
      jest.spyOn(userModel, "find").mockResolvedValue(null);

      const response = await request(app).get("/api/v1/admin/getAlluser");

      expect([500, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect([
        "Failed to create user",
        "Failed To Create User",
        "Internal Server Error"
      ]).toContain(response.body.message);
    });
  });

  describe("getOneUserByUsername", () => {
    it("fetches a user by username successfully", async () => {
      const mockUser = { username: "user1", email: "user1@example.com" };
      jest.spyOn(userModel, "findOne").mockResolvedValue(mockUser);

      const response = await request(app).get("/api/v1/admin/getOneUserByUsername/user1");

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["User found", "User Found"]).toContain(response.body.message);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toMatchObject(mockUser);
    });

    it("returns 500 if user not found", async () => {
      jest.spyOn(userModel, "findOne").mockResolvedValue(null);

      const response = await request(app).get("/api/v1/admin/getOneUserByUsername/nonexistent");

      expect([500, 404, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect([
        "Failed to create user",
        "Failed To Create User",
        "User not found",
        "User Not Found"
      ]).toContain(response.body.message);
    });
  });

  describe("deleteOneUserByUsername", () => {
    it("deletes a user by username successfully", async () => {
      const mockUser = { username: "user1", email: "user1@example.com" };
      jest.spyOn(userModel, "findOneAndDelete").mockResolvedValue(mockUser);

      const response = await request(app).get("/api/v1/admin/deleteOneUserByUsername/user1");

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["User found", "User Found"]).toContain(response.body.message);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toMatchObject(mockUser);
    });

    it("returns 500 if user to delete not found", async () => {
      jest.spyOn(userModel, "findOneAndDelete").mockResolvedValue(null);

      const response = await request(app).get("/api/v1/admin/deleteOneUserByUsername/nonexistent");

      expect([500, 404, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect([
        "Failed to create user",
        "Failed To Create User",
        "User not found",
        "User Not Found"
      ]).toContain(response.body.message);
    });
  });
});
