const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/User"); // Adjust path if necessary

// Load environment variables from .env file in the server directory
dotenv.config({ path: "./.env" });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

const seedAdmin = async () => {
  await connectDB(); // Connect to the database

  const adminEmail = "deanacademics@prasad.edu.in";
  const adminName = "Dean Academics PIMS"; // You can change the name

  try {
    // Check if the admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin user with email ${adminEmail} already exists.`);
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log(`Updated existing user ${adminEmail} to admin role.`);
      }
    } else {
      // Create the new admin user
      const newAdmin = await User.create({
        name: adminName,
        email: adminEmail,
        role: "admin",
        // For OAuth users, no password is set directly in the DB.
        // The user will authenticate via Google, and our backend will match their email
        // to this seeded admin record.
        batch: undefined, // Admins don't typically have a batch
      });
      console.log(
        `Admin user ${newAdmin.email} created successfully with ID: ${newAdmin._id}`
      );
    }
  } catch (error) {
    console.error(`Error seeding admin data: ${error.message}`);
  } finally {
    mongoose.connection.close(); // Close the database connection
    console.log("MongoDB connection closed.");
  }
};

seedAdmin();
