#!/usr/bin/env node

/**
 * Simple MCP-style Browser Testing Server
 * Provides browser automation capabilities for testing
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BrowserTestingServer {
  constructor() {
    this.browser = null;
    this.pages = new Map();
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: process.env.HEADLESS !== 'false',
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
      });
      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async createPage(pageId = 'default') {
    if (!this.browser) {
      await this.initialize();
    }
    
    const page = await this.browser.newPage();
    this.pages.set(pageId, page);
    return pageId;
  }

  async navigate(pageId, url, options = {}) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    await page.goto(url, { waitUntil: 'networkidle0', ...options });
    return { success: true, url: page.url() };
  }

  async screenshot(pageId, filePath, options = {}) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    const fullPath = path.resolve(filePath);
    await page.screenshot({ path: fullPath, fullPage: true, ...options });
    return { success: true, path: fullPath };
  }

  async click(pageId, selector) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    await page.waitForSelector(selector);
    await page.click(selector);
    return { success: true };
  }

  async type(pageId, selector, text) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    await page.waitForSelector(selector);
    await page.type(selector, text);
    return { success: true };
  }

  async evaluate(pageId, script) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    const result = await page.evaluate(script);
    return { success: true, result };
  }

  async waitForSelector(pageId, selector, options = {}) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    await page.waitForSelector(selector, options);
    return { success: true };
  }

  async getPageInfo(pageId) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    return {
      url: page.url(),
      title: await page.title(),
      viewport: page.viewport()
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pages.clear();
    }
  }
}

// CLI interface
async function runCLI() {
  const server = new BrowserTestingServer();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  try {
    switch (command) {
      case 'test':
        await server.initialize();
        const pageId = await server.createPage();
        await server.navigate(pageId, args[0] || 'http://localhost:3000');
        await server.screenshot(pageId, 'test-output.png');
        console.log('Test completed - screenshot saved');
        break;
        
      case 'screenshot':
        await server.initialize();
        const screenshotPageId = await server.createPage();
        await server.navigate(screenshotPageId, args[0]);
        await server.screenshot(screenshotPageId, args[1] || 'screenshot.png');
        console.log(`Screenshot saved: ${args[1] || 'screenshot.png'}`);
        break;
        
      default:
        console.log('Available commands:');
        console.log('  test [url] - Run basic test');
        console.log('  screenshot [url] [filename] - Take screenshot');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await server.close();
  }
}

if (require.main === module) {
  runCLI();
}

module.exports = BrowserTestingServer;