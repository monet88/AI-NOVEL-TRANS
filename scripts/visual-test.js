import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '../plans/reports/screenshots');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function runTest() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  
  try {
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Screenshot 1: Dashboard
    await page.screenshot({ path: path.join(REPORTS_DIR, '01-dashboard.png') });
    console.log('Saved 01-dashboard.png');
    
    // If there is an Open Project button, click it
    const openBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent && b.textContent.includes('Open Project'));
    });
    
    if (openBtn && openBtn.click) {
        console.log('Opening project...');
        await openBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Screenshot 2: Workspace empty
        await page.screenshot({ path: path.join(REPORTS_DIR, '02-workspace.png') });
        console.log('Saved 02-workspace.png');
        
        // Click Sidebar
        const sidebarToggle = await page.$('button[title="Open Sidebar"], button[title="Close Sidebar"]');
        if (sidebarToggle) {
            await sidebarToggle.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Screenshot 3: Sidebar open
            await page.screenshot({ path: path.join(REPORTS_DIR, '03-sidebar.png') });
            console.log('Saved 03-sidebar.png');
        }
    } else {
        console.log('No project found, creating one...');
        const createBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent && b.textContent.includes('Create Project'));
        });
        if (createBtn && createBtn.click) {
            await createBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Screenshot 2: Workspace empty
            await page.screenshot({ path: path.join(REPORTS_DIR, '02-workspace.png') });
            console.log('Saved 02-workspace.png');
        }
    }

    console.log('Visual tests completed successfully. Screenshots saved to plans/reports/screenshots/');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

runTest();
