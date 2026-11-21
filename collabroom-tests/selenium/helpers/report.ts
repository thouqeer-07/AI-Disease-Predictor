import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export interface TestResultItem {
  testId: string;
  testName: string;
  category: string;
  status: 'PASS' | 'FAIL';
  errorMessage?: string;
  durationMs: number;
  timestamp: string;
  screenshotPath?: string;
}

export class ReportGenerator {
  private static results: TestResultItem[] = [];

  public static addResult(result: TestResultItem) {
    this.results.push(result);
  }

  public static async generateExcelReport(outputPath?: string): Promise<string> {
    const reportDir = path.resolve(process.cwd(), '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const fileLocation = outputPath || path.join(reportDir, 'selenium-report.xlsx');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Execution Report');

    worksheet.columns = [
      { header: 'Test ID', key: 'testId', width: 12 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Error Message', key: 'errorMessage', width: 40 },
      { header: 'Duration (ms)', key: 'durationMs', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'Screenshot Path', key: 'screenshotPath', width: 35 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sort results by test ID
    this.results.sort((a, b) => a.testId.localeCompare(b.testId));

    this.results.forEach((res) => {
      const row = worksheet.addRow({
        testId: res.testId,
        testName: res.testName,
        category: res.category,
        status: res.status,
        errorMessage: res.errorMessage || '',
        durationMs: res.durationMs,
        timestamp: res.timestamp,
        screenshotPath: res.screenshotPath || ''
      });

      const statusCell = row.getCell('status');
      if (res.status === 'PASS') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DCFCE7' }
        };
        statusCell.font = { color: { argb: '15803D' }, bold: true };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FEE2E2' }
        };
        statusCell.font = { color: { argb: 'B91C1C' }, bold: true };
      }
    });

    try {
      await workbook.xlsx.writeFile(fileLocation);
      console.log(`\n📊 Excel report successfully generated with ${this.results.length} rows at: ${fileLocation}`);
    } catch (err: any) {
      if (err.code === 'EBUSY') {
        const altPath = path.join(reportDir, `selenium-report-${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(altPath);
        console.log(`\n📊 Excel report generated at fallback path: ${altPath}`);
        return altPath;
      }
      console.error('Error generating Excel report:', err);
    }
    return fileLocation;
  }
}
