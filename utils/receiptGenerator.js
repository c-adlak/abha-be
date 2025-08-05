const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

exports.generateReceipt = async (transaction, feeCollection) => {
  try {
    const doc = new PDFDocument();
    const fileName = `receipt_${transaction.transactionId}.pdf`;
    const filePath = path.join(__dirname, "../receipts", fileName);

    // Ensure receipts directory exists
    const receiptDir = path.dirname(filePath);
    if (!fs.existsSync(receiptDir)) {
      fs.mkdirSync(receiptDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text("PAYMENT RECEIPT", 50, 50);
    doc.fontSize(12).text(`Receipt No: ${feeCollection.receiptNumber}`, 50, 80);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 100);
    doc.text(`Transaction ID: ${transaction.transactionId}`, 50, 120);

    // Student Details
    doc.fontSize(14).text("Student Details:", 50, 160);
    doc
      .fontSize(10)
      .text(`Amount: ₹${transaction.amount}`, 50, 180)
      .text(`Payment Method: ${transaction.paymentMethod}`, 50, 200)
      .text(`Status: ${transaction.paymentStatus}`, 50, 220);

    doc.end();

    return `/receipts/${fileName}`;
  } catch (error) {
    console.error("Receipt generation error:", error);
    return null;
  }
};
