import * as XLSX from 'xlsx';
import type { Salon } from '../types';

/**
 * Exports an array of salons to an Excel file using SheetJS.
 */
export function exportToExcel(salons: Salon[], locationName: string) {
  if (!salons || salons.length === 0) return;

  // Map fields into flat structure for Excel columns
  const data = salons.map(s => ({
    'Client Status': s.isClient ? 'Existing Client (Catered)' : 'Potential Lead',
    'Matched Client Name': s.matchedClient ? s.matchedClient.clientName : '',
    'Business Name': s.name,
    'Phone': s.phone || 'Phone not available',
    'Address': s.address,
    'Area': s.area,
    'City': s.city,
    'District': s.district,
    'State': s.state,
    'Pincode': s.pincode,
    'Category': s.category,
    'Latitude': s.latitude,
    'Longitude': s.longitude,
    'Source': s.source,
    'Map Link': s.mapUrl
  }));

  // Create a worksheet from JSON
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set professional column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Client Status
    { wch: 25 }, // Matched Client Name
    { wch: 32 }, // Business Name
    { wch: 18 }, // Phone
    { wch: 50 }, // Address
    { wch: 20 }, // Area
    { wch: 18 }, // City
    { wch: 18 }, // District
    { wch: 18 }, // State
    { wch: 10 }, // Pincode
    { wch: 24 }, // Category
    { wch: 12 }, // Latitude
    { wch: 12 }, // Longitude
    { wch: 15 }, // Source
    { wch: 45 }  // Map Link
  ];

  // Create a new workbook and add the sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cosmetics_Distributors');

  // Sanitize the location string for filename safety
  const safeLocation = locationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const filename = `cosmetics_distributors_${safeLocation || 'results'}.xlsx`;

  // Trigger file download
  XLSX.writeFile(workbook, filename);
}
