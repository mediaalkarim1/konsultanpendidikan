export type WaTemplateData = {
  nama: string;
  nama_anak?: string;
  nomor: string;
  jenjang: string;
  tanggal: string;
  status: string;
  id_konsultasi: string;
};

export function renderWaTemplate(content: string, data: WaTemplateData): string {
  if (!content) return "";
  
  return content
    .replace(/\{\{\s*nama\s*\}\}/gi, data.nama || "")
    .replace(/\{\{\s*nama_anak\s*\}\}/gi, data.nama_anak || "")
    .replace(/\{\{\s*nomor\s*\}\}/gi, data.nomor || "")
    .replace(/\{\{\s*jenjang\s*\}\}/gi, data.jenjang || "")
    .replace(/\{\{\s*tanggal\s*\}\}/gi, data.tanggal || "")
    .replace(/\{\{\s*status\s*\}\}/gi, data.status || "")
    .replace(/\{\{\s*id_konsultasi\s*\}\}/gi, data.id_konsultasi || "");
}
