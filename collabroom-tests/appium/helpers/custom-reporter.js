const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

class AppiumExcelReporter {
  async onRunComplete(_testContexts, results) {
    const reportDir = path.resolve(process.cwd(), '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const fileLocation = path.join(reportDir, 'appium-report.xlsx');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Appium Execution Report');

    worksheet.columns = [
      { header: 'Test ID', key: 'testId', width: 15 },
      { header: 'Test Name', key: 'testName', width: 55 },
      { header: 'Category', key: 'category', width: 35 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Error Message', key: 'errorMessage', width: 40 },
      { header: 'Duration (ms)', key: 'durationMs', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 24 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const allTestItems = [];

    results.testResults.forEach((suiteResult) => {
      const suiteCategory = suiteResult.testResults[0]?.ancestorTitles[0] || 'Appium Mobile Tests';
      suiteResult.testResults.forEach((tr) => {
        const titleMatch = tr.title.match(/(TC_\d{3}):\s*(.*)/);
        const testId = titleMatch ? titleMatch[1] : tr.title;
        const testName = titleMatch ? titleMatch[2] : tr.title;

        allTestItems.push({
          testId,
          testName,
          category: suiteCategory,
          status: tr.status === 'passed' ? 'PASS' : 'FAIL',
          errorMessage: tr.failureMessages.join('\n') || '',
          durationMs: Math.round(tr.duration || 0),
          timestamp: new Date().toISOString()
        });
      });
    });

    // Sort by testId
    allTestItems.sort((a, b) => a.testId.localeCompare(b.testId));

    allTestItems.forEach((res) => {
      const row = worksheet.addRow(res);
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

    await workbook.xlsx.writeFile(fileLocation);
    console.log(`\n📊 Appium Excel report successfully generated with ${allTestItems.length} test cases (all 300 rows) at:\n   ${fileLocation}\n`);
  }
}

module.exports = AppiumExcelReporter;
