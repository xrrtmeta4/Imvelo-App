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
  
  // Load and add logo
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
    doc.addImage(logoImg, 'PNG', logoX, 10, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to load logo:', error);
  }

  // Title
  doc.setFontSize(24);
  doc.setTextColor(34, 139, 34); // Forest green
  doc.text('Imvelo', pageWidth / 2, 60, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('Ungani webalimi mhlaba wonkhe jikelele', pageWidth / 2, 70, { align: 'center' });

  // Report title
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(result.title, pageWidth / 2, 90, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Generated: ${date}`, pageWidth / 2, 100, { align: 'center' });

  // Results content
  let yPosition = 120;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  Object.entries(result.data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (Array.isArray(value)) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 20, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        value.forEach((item, index) => {
          doc.text(`• ${item}`, 25, yPosition);
          yPosition += 7;
        });
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 20, yPosition);
        doc.setFont('helvetica', 'normal');
        const textValue = String(value);
        const textLines = doc.splitTextToSize(textValue, pageWidth - 80);
        doc.text(textLines, 80, yPosition);
        yPosition += Math.max(8, textLines.length * 7);
      }
      yPosition += 3;
    }
  });

  // Footer with contact details
  const footerY = pageHeight - 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);
  doc.text('Imvelo - Ungani webalimi mhlaba wonkhe jikelele', pageWidth / 2, footerY - 5, { align: 'center' });
  doc.text('Email: imveloapps@gmail.com | Phone: +268 7921 5621', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Mbabane, Eswatini', pageWidth / 2, footerY + 5, { align: 'center' });

  // Download
  doc.save(`imvelo-${result.type}-report-${Date.now()}.pdf`);
};
