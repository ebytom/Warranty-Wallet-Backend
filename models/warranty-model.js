const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const warrantySchema = new Schema({
  itemName: {
    type: String,
    required: [true, "Item name is required"],
  },
  category: {
    type: String,
    required: [true, "Item category is required"],
  },
  warrantyProvider: {
    type: String,
    required: [true, "Warranty provider is required"],
  },
  purchasedOn: {
    type: Date,
    required: [true, "Please enter the purchase date"],
  },
  expiresOn: {
    type: Date,
    required: [true, "Please enter the warranty expiry date"],
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  description: {
    type: String,
    trim: true,
    required: [true, "Please provide details on coverage"],
  },
  addedBy: {
    type: String,
    required: [true, "User ID is required"],
  },
  invoiceURL: {
    type: String,
    required: [true, "Invoice URL is required"]
  }
});

const Warranty = mongoose.model("Warranty", warrantySchema);

module.exports = Warranty;