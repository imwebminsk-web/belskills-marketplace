/** Formats invoice number with leading zeros (e.g. 1 → "0001"). */
export function formatInvoiceNumber(invoiceNumber: number): string {
  return String(invoiceNumber).padStart(4, "0");
}
