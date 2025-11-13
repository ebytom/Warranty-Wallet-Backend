const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Warranty = require("../models/warranty-model");
const User = require("../models/user-model");

jest.mock("aws-sdk", () => {
  const S3 = {
    upload: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({ Location: "https://mock-s3-url.com/invoice.pdf" }),
  };
  return { S3: jest.fn(() => S3) };
});

jest.mock("../models/warranty-model");
jest.mock("../models/user-model");

describe("Warranty Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("addWarranty", () => {
    it("adds a warranty successfully with a file upload", async () => {
      const mockUser = { googleId: "12345", email: "user@example.com" };
      const mockWarranties = [
        {
          itemName: "Laptop",
          category: "Electronics",
          warrantyProvider: "Provider",
          purchasedOn: "2023-01-01",
          expiresOn: "2024-01-01",
          description: "Test warranty",
          addedBy: "12345",
          invoiceURL: "https://mock-s3-url.com/invoice.pdf",
        }
      ];

      jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
      jest.spyOn(Warranty.prototype, "save").mockResolvedValue(mockWarranties[0]);
      jest.spyOn(Warranty, "find").mockResolvedValue(mockWarranties);


      const response = await request(app)
        .post("/api/v1/app/warranty/addWarranty")
        .field("itemName", "Laptop")
        .field("category", "Electronics")
        .field("warrantyProvider", "Provider")
        .field("purchasedOn", "2023-01-01")
        .field("expiresOn", "2024-01-01")
        .field("description", "Test warranty")
        .field("addedBy", "12345")
        .attach("invoiceFile", Buffer.from("mock file content"), "invoice.pdf");

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Warranty added successfully");
      expect(response.body.warranties).toBeDefined();
    });

    it("returns 404 if the user is not found", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/app/warranty/addWarranty")
        .send({
          itemName: "Laptop",
          category: "Electronics",
          warrantyProvider: "Provider",
          purchasedOn: "2023-01-01",
          expiresOn: "2024-01-01",
          description: "Test warranty",
          addedBy: "12345",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });

    it("returns 500 if an error occurs during warranty creation", async () => {
      jest.spyOn(User, "findOne").mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .post("/api/v1/app/warranty/addWarranty")
        .send({
          itemName: "Laptop",
          category: "Electronics",
          warrantyProvider: "Provider",
          purchasedOn: "2023-01-01",
          expiresOn: "2024-01-01",
          description: "Test warranty",
          addedBy: "12345",
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to add warranty");
    });
  });

  describe("getWarrantyById", () => {
    it("fetches a warranty by ID successfully", async () => {
      const mockWarranty = {
        _id: new mongoose.Types.ObjectId(),
        itemName: "Laptop",
        category: "Electronics",
        warrantyProvider: "Provider",
        purchasedOn: "2023-01-01",
        expiresOn: "2024-01-01",
        description: "Test warranty",
      };

      jest.spyOn(Warranty, "findById").mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWarranty)
      });

      const response = await request(app).get(`/api/v1/app/warranty/getWarrantyById/${mockWarranty._id}`);

      expect(response.status).toBe(200);
      expect(response.body.itemName).toBe("Laptop");
    });

    it("returns 404 if the warranty is not found", async () => {
      jest.spyOn(Warranty, "findById").mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app).get(`/api/v1/app/warranty/getWarrantyById/${new mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Warranty not found");
    });

    it("returns 400 for an invalid warranty ID", async () => {
      const response = await request(app).get("/api/v1/app/warranty/getWarrantyById/invalid-id");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid warranty ID");
    });
  });

  describe("deleteWarrantyById", () => {
    it("deletes a warranty successfully", async () => {
      const mockWarranty = { _id: new mongoose.Types.ObjectId() };
      const mockWarranties = [];

      jest.spyOn(Warranty, "findByIdAndDelete").mockResolvedValue(mockWarranty);

      const response = await request(app).delete(`/api/v1/app/warranty/deleteWarrantyById/${mockWarranty._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Warranty deleted");
    });

    it("returns 404 if the warranty to delete is not found", async () => {
      jest.spyOn(Warranty, "findByIdAndDelete").mockResolvedValue(null);

      const response = await request(app).delete(`/api/v1/app/warranty/deleteWarrantyById/${new mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Warranty not found");
    });

    it("returns 400 for an invalid warranty ID", async () => {
      const response = await request(app).delete("/api/v1/app/warranty/deleteWarrantyById/invalid-id");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid warranty ID");
    });
  });

  describe("getAllWarrantyByUser", () => {
    it("fetches all warranties for a user successfully", async () => {
      const mockUser = { googleId: "12345", email: "user@example.com" };
      const mockWarranties = [
        {
          itemName: "Laptop",
          category: "Electronics",
          addedBy: "12345",
          daysLeft: 365,
          percentage: "0.00"
        }
      ];

      jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
      jest.spyOn(Warranty, "find").mockResolvedValue([mockWarranties[0]]);

      const response = await request(app).get("/api/v1/app/warranty/getAllWarrantyByUser/12345");

      expect([200, 201]).toContain(response.status);
      // Controller returns an array, not { warranties: [...] }
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("returns 404 if user not found", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const response = await request(app).get("/api/v1/app/warranty/getAllWarrantyByUser/nonexistent");

      expect([404, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["User not found", "User Not Found"]).toContain(response.body.message);
    });
  });

  describe("shareAccess", () => {
    it("shares access to warranty successfully", async () => {
      const mockWarranty = {
        _id: new mongoose.Types.ObjectId(),
        sharedWith: [],
        save: jest.fn().mockResolvedValue(true)
      };
      const mockUser = { email: "target@example.com" };

      jest.spyOn(Warranty, "findById").mockResolvedValue(mockWarranty);
      jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

      const response = await request(app)
        .post(`/api/v1/app/warranty/shareAccess/${mockWarranty._id}`)
        .send({ email: "target@example.com" });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Access shared successfully", "Access Shared Successfully"]).toContain(response.body.message);
    });

    it("returns 404 if warranty not found", async () => {
      jest.spyOn(Warranty, "findById").mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/app/warranty/shareAccess/${new mongoose.Types.ObjectId()}`)
        .send({ email: "target@example.com" });

      expect([404, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Warranty not found", "Warranty Not Found"]).toContain(response.body.message);
    });
  });

  describe("revokeAccess", () => {
    it("revokes access to warranty successfully", async () => {
      const mockWarranty = {
        _id: new mongoose.Types.ObjectId(),
        sharedWith: ["target@example.com"],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Warranty, "findById").mockResolvedValue(mockWarranty);

      const response = await request(app)
        .delete(`/api/v1/app/warranty/revokeAccess/${mockWarranty._id}`)
        .send({ email: "target@example.com" });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Access revoked successfully", "Access Revoked Successfully"]).toContain(response.body.message);
    });

    it("returns 404 if warranty not found", async () => {
      jest.spyOn(Warranty, "findById").mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/v1/app/warranty/revokeAccess/${new mongoose.Types.ObjectId()}`)
        .send({ email: "target@example.com" });

      expect([404, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(["Warranty not found", "Warranty Not Found"]).toContain(response.body.message);
    });
  });
});
