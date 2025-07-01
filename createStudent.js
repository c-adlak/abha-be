const bcrypt = require("bcryptjs");
const Student = require("./models/Student");

const createStudent = async () => {
  const hashedPassword = await bcrypt.hash("defaultPassword123", 10);

  await Student.create({
    studentId: "STU123456",
    password: hashedPassword,
    name: "John Doe",
    class: "10A",
  });

  console.log("Student created");
};
module.exports = createStudent;
