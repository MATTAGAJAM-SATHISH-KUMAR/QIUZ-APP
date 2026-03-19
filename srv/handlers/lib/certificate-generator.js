// ============================================================================
// Certificate Generator — Creates PDF certificates for passing students
// ============================================================================
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class CertificateGenerator {
  /**
   * Generate a PDF certificate.
   * @returns {string} Path/URL to the generated PDF
   */
  async generate(user, quiz, attempt, certCode) {
    const outputDir = path.join(process.cwd(), 'gen', 'certificates');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${certCode}.pdf`;
    const filePath = path.join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 70, right: 70 }
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Border
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .lineWidth(3)
        .strokeColor('#1a5276')
        .stroke();

      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
        .lineWidth(1)
        .strokeColor('#2980b9')
        .stroke();

      // Header
      doc.moveDown(2);
      doc.fontSize(16).fillColor('#7f8c8d')
        .text('CERTIFICATE OF COMPLETION', { align: 'center' });

      doc.moveDown(1);
      doc.fontSize(36).fillColor('#1a5276')
        .text('Certificate of Achievement', { align: 'center' });

      // Decorative line
      doc.moveDown(0.5);
      const centerX = doc.page.width / 2;
      doc.moveTo(centerX - 100, doc.y).lineTo(centerX + 100, doc.y)
        .lineWidth(2).strokeColor('#e74c3c').stroke();

      // Body
      doc.moveDown(1.5);
      doc.fontSize(14).fillColor('#2c3e50')
        .text('This is to certify that', { align: 'center' });

      doc.moveDown(0.5);
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      doc.fontSize(28).fillColor('#1a5276')
        .text(fullName, { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#2c3e50')
        .text('has successfully completed the quiz', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(22).fillColor('#e74c3c')
        .text(quiz.title, { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#7f8c8d')
        .text(`Score: ${attempt.scorePercentage}% | Date: ${new Date(attempt.submittedAt).toLocaleDateString()}`, { align: 'center' });

      // Certificate code
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#95a5a6')
        .text(`Verification Code: ${certCode}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(`/certificates/${filename}`));
      stream.on('error', reject);
    });
  }
}

module.exports = { CertificateGenerator };
