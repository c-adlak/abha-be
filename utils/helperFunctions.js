function generateEnrollmentNumber(currentEnrollment = "ABHA05A000") {
  const schoolCode = currentEnrollment.slice(0, 4); // "ABHA"
  const classCode = currentEnrollment.slice(4, 6); // "05"
  const section = currentEnrollment[6]; // "A"
  const uniqueNumber = parseInt(currentEnrollment.slice(7), 10); // "023" -> 23

  const nextUniqueNumber = uniqueNumber + 1;

  const formattedNumber = String(nextUniqueNumber).padStart(3, "0");

  // Combine all parts
  const newEnrollment = `${schoolCode}${classCode}${section}${formattedNumber}`;

  return newEnrollment;
}
function generateEnrollmentNumberforTeacher(currentEnrollment = "ABHATEA000") {
  const schoolCode = currentEnrollment.slice(0, 4); // "ABHA"
  const classCode = currentEnrollment.slice(4, 7); // "TEA"
  const uniqueNumber = parseInt(currentEnrollment.slice(8), 10); // "023" -> 23

  const nextUniqueNumber = uniqueNumber + 1;

  const formattedNumber = String(nextUniqueNumber).padStart(3, "0");

  // Combine all parts
  const newEnrollment = `${schoolCode}${classCode}${formattedNumber}`;

  return newEnrollment;
}

module.exports = {
  generateEnrollmentNumber,
  generateEnrollmentNumberforTeacher,
};
