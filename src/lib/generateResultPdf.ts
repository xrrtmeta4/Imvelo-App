import { jsPDF } from 'jspdf';

interface ResultData {
  title: string;
  type: 'pest' | 'animal-disease' | 'produce';
  data: Record<string, any>;
}

export const generateResultPdf = async (result: ResultData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 7 * 1.5; // 1.5 spacing
  const footerHeight = 45; // Reserve space for footer
  const maxContentY = pageHeight - footerHeight; // Content must not exceed this
  
  // Load and add logo at the top center
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/imvelo-logo.png';
    });
    
    const logoWidth = 40;
    const logoHeight = 40;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(logoImg, 'PNG', logoX, 12, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to load logo:', error);
  }

  // Title - Imvelo (Times New Roman Bold)
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(34, 139, 34);
  doc.text('Imvelo', pageWidth / 2, 62, { align: 'center' });
  
  // Tagline (Times New Roman Italic)
  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("Farmer's Best Friend", pageWidth / 2, 72, { align: 'center' });

  // Divider line
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.8);
  doc.line(margin, 80, pageWidth - margin, 80);

  // Report title (Times New Roman Bold)
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(result.title, pageWidth / 2, 95, { align: 'center' });

  // Date (Times New Roman Normal)
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Generated: ${date}`, pageWidth / 2, 105, { align: 'center' });

  // Content area starts here
  let yPosition = 120;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // Helper function to add new page if needed
  const checkPageBreak = () => {
    if (yPosition > maxContentY) {
      // Add footer before new page
      addFooter();
      doc.addPage();
      yPosition = margin + 10;
      return true;
    }
    return false;
  };

  // Helper function to add footer
  const addFooter = () => {
    const footerY = pageHeight - 35;
    
    // Footer divider line
    doc.setDrawColor(34, 139, 34);
    doc.setLineWidth(0.8);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
    
    // Footer title
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(34, 139, 34);
    doc.text("Imvelo - Farmer's Best Friend", pageWidth / 2, footerY, { align: 'center' });
    
    // Contact details
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('Email: imveloapps@gmail.com | Phone: +268 7921 5621', pageWidth / 2, footerY + 8, { align: 'center' });
    doc.text('Mbabane, Eswatini | USSD: *384*51139#', pageWidth / 2, footerY + 15, { align: 'center' });
  };

  // Render content with proper spacing
  Object.entries(result.data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (Array.isArray(value)) {
        // Label for array
        checkPageBreak();
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(`${label}:`, margin, yPosition);
        yPosition += lineHeight;
        
        // Array items
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        value.forEach((item) => {
          const bulletText = `• ${item}`;
          const lines = doc.splitTextToSize(bulletText, contentWidth - 10);
          lines.forEach((line: string) => {
            checkPageBreak();
            doc.text(line, margin + 8, yPosition);
            yPosition += lineHeight;
          });
        });
        yPosition += 5;
        
      } else {
        // Single value field
        checkPageBreak();
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(`${label}:`, margin, yPosition);
        
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        const textValue = String(value);
        const textLines = doc.splitTextToSize(textValue, contentWidth - 5);
        
        if (textLines.length === 1 && textLines[0].length < 50) {
          // Short value - same line
          doc.text(textLines[0], margin + doc.getTextWidth(`${label}: `) + 5, yPosition);
          yPosition += lineHeight;
        } else {
          // Long value - next line with indent
          yPosition += lineHeight;
          textLines.forEach((line: string) => {
            checkPageBreak();
            doc.text(line, margin + 5, yPosition);
            yPosition += lineHeight;
          });
        }
        yPosition += 5;
      }
    }
  });

  // Add footer to the last page
  addFooter();

  // Download
  doc.save(`imvelo-${result.type}-report-${Date.now()}.pdf`);
};
