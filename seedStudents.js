const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/User");
const fs = require("fs");
const path = require("path");

// Load environment variables
dotenv.config({ path: "./.env" });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const seedStudents = async () => {
  await connectDB();

  try {
    // Read the users.json file
    const usersFilePath = path.join(__dirname, "users.json");
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, "utf8"));

    // Filter only students
    const students = usersData.users.filter(user => user.role === 'student');
    console.log(`Found ${students.length} students in users.json (out of ${usersData.users.length} total users)`);

    let studentsCreated = 0;
    let studentsUpdated = 0;
    let studentsSkipped = 0;
    let errors = 0;

    // Process each student
    for (const studentData of students) {
      try {
        // Skip if no email or batch
        if (!studentData.email) {
          console.log(`Skipping student without email: ${studentData.name}`);
          errors++;
          continue;
        }

        if (!studentData.batch) {
          console.log(`Skipping student without batch: ${studentData.email}`);
          errors++;
          continue;
        }

        // Check if student already exists
        const existingStudent = await User.findOne({ email: studentData.email.toLowerCase() });

        if (existingStudent) {
          // Student exists - check if we need to update
          let needsUpdate = false;
          
          if (existingStudent.name !== studentData.name) {
            existingStudent.name = studentData.name;
            needsUpdate = true;
          }
          
          if (existingStudent.batch !== studentData.batch) {
            existingStudent.batch = studentData.batch;
            needsUpdate = true;
          }

          if (existingStudent.role !== 'student') {
            existingStudent.role = 'student';
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingStudent.save();
            studentsUpdated++;
            console.log(`Updated student: ${studentData.email} (${studentData.batch})`);
          } else {
            studentsSkipped++;
          }
        } else {
          // Create new student
          const newStudent = await User.create({
            name: studentData.name,
            email: studentData.email,
            batch: studentData.batch,
            role: 'student',
          });

          studentsCreated++;
          console.log(`Created student: ${newStudent.email} (${newStudent.batch})`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing student ${studentData.email}: ${error.message}`);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("STUDENT SEEDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total students in JSON: ${students.length}`);
    console.log(`  - Created: ${studentsCreated}`);
    console.log(`  - Updated: ${studentsUpdated}`);
    console.log(`  - Skipped (already exists): ${studentsSkipped}`);
    console.log(`  - Errors: ${errors}`);
    console.log("=".repeat(60));

    // Show batch distribution
    const batchStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$batch', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    if (batchStats.length > 0) {
      console.log("\nBATCH DISTRIBUTION:");
      console.log("=".repeat(60));
      batchStats.forEach(batch => {
        console.log(`  ${batch._id || 'Unassigned'}: ${batch.count} students`);
      });
      console.log("=".repeat(60));
    }

  } catch (error) {
    console.error(`Error seeding students: ${error.message}`);
  } finally {
    mongoose.connection.close();
    console.log("\nMongoDB connection closed.");
  }
};

// Run the seeding
seedStudents();
