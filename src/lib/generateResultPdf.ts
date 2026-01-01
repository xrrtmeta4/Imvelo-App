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
  
  // Load and add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/imvelo-logo.png';
    });
    
    const logoWidth = 35;
    const logoHeight = 35;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(logoImg, 'PNG', logoX, 15, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to load logo:', error);
  }

  // Title - Imvelo
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(34, 139, 34);
  doc.text('Imvelo', pageWidth / 2, 60, { align: 'center' });
  
  // Tagline
  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("Farmer's Best Friend", pageWidth / 2, 70, { align: 'center' });

  // Divider line
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, 78, pageWidth - margin, 78);

  // Report title
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(result.title, pageWidth / 2, 92, { align: 'center' });

  // Date
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Generated: ${date}`, pageWidth / 2, 102, { align: 'center' });

  // Results content with justified text
  let yPosition = 120;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  Object.entries(result.data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (Array.isArray(value)) {
        doc.setFont('times', 'bold');
        doc.text(`${label}:`, margin, yPosition);
        yPosition += lineHeight;
        doc.setFont('times', 'normal');
        value.forEach((item) => {
          const bulletText = `• ${item}`;
          const lines = doc.splitTextToSize(bulletText, contentWidth - 10);
          lines.forEach((line: string) => {
            doc.text(line, margin + 5, yPosition, { align: 'justify', maxWidth: contentWidth - 10 });
            yPosition += lineHeight;
          });
        });
      } else {
        doc.setFont('times', 'bold');
        doc.text(`${label}:`, margin, yPosition);
        
        doc.setFont('times', 'normal');
        const textValue = String(value);
        const textLines = doc.splitTextToSize(textValue, contentWidth - 50);
        
        if (textLines.length === 1) {
          doc.text(textLines[0], margin + 50, yPosition);
          yPosition += lineHeight;
        } else {
          yPosition += lineHeight;
          textLines.forEach((line: string) => {
            doc.text(line, margin, yPosition, { align: 'justify', maxWidth: contentWidth });
            yPosition += lineHeight;
          });
        }
      }
      yPosition += 3;
    }
  });

  // Footer
  const footerY = pageHeight - 25;
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(34, 139, 34);
  doc.text("Imvelo - Farmer's Best Friend", pageWidth / 2, footerY - 3, { align: 'center' });
  
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Email: imveloapps@gmail.com | Phone: +268 7921 5621', pageWidth / 2, footerY + 4, { align: 'center' });
  doc.text('Mbabane, Eswatini', pageWidth / 2, footerY + 10, { align: 'center' });

  // Download
  doc.save(`imvelo-${result.type}-report-${Date.now()}.pdf`);
};
