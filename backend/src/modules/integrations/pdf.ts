/** อ่านข้อความจาก PDF (รองรับไฟล์ที่ล็อกรหัส) ด้วย pdfjs-dist */

export class PdfNeedsPasswordError extends Error {}
export class PdfWrongPasswordError extends Error {}

export async function extractPdfText(data: Buffer, password?: string): Promise<string> {
  // dynamic import (legacy ESM build) — ใช้ได้ใน CJS/tsx
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let doc: any;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(data),
      password: password ?? '',
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') {
      // code 2 = INCORRECT_PASSWORD, อื่นๆ = ต้องใส่รหัส
      if (e.code === 2) throw new PdfWrongPasswordError('รหัสผ่าน PDF ไม่ถูกต้อง');
      throw new PdfNeedsPasswordError('PDF นี้ต้องใส่รหัสผ่าน');
    }
    throw e;
  }
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => ('str' in it ? it.str : '')).join(' ') + '\n';
  }
  return text;
}
