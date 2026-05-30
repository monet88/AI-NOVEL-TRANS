import { Project } from '../types';

export const exportService = {
  exportToMarkdown(project: Project) {
    let content = `# ${project.name}\n\n`;
    project.chapters.forEach((chapter) => {
      content += `## ${chapter.name}\n\n${chapter.translatedText || chapter.sourceText}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    this.downloadBlob(blob, `${project.name}.md`);
  },

  async exportToDocx(project: Project) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: project.name,
            heading: HeadingLevel.TITLE,
          }),
          ...project.chapters.flatMap(chapter => [
            new Paragraph({
              text: chapter.name,
              heading: HeadingLevel.HEADING_1,
            }),
            ...chapter.translatedText.split('\n').filter(p => p.trim() !== '').map(para =>
              new Paragraph({
                children: [new TextRun(para)],
              })
            ),
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    this.downloadBlob(blob, `${project.name}.docx`);
  },

  async exportToPdf(project: Project) {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(20);
    doc.text(project.name, 20, yPos);
    yPos += 15;

    doc.setFontSize(12);
    project.chapters.forEach(chapter => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(16);
      doc.text(chapter.name, 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      const textLines = doc.splitTextToSize(chapter.translatedText || chapter.sourceText, 170);

      for (let i = 0; i < textLines.length; i++) {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(textLines[i], 20, yPos);
        yPos += 7;
      }
      yPos += 10;
    });

    doc.save(`${project.name}.pdf`);
  },

  async exportToEpub(_project: Project) {
    // Note: Standard EPUB generation libraries often rely on Node.js 'fs' module.
    // For a fully browser-based solution, we would need to implement EPUB generation 
    // using libraries like JSZip and custom XML templating.
    console.warn('EPUB export is currently not implemented for the browser environment.');
    alert('EPUB export is currently not supported in this version. Please use DOCX or PDF export instead.');
  },

  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
