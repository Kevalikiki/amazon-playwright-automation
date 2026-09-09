import { test, expect } from '@playwright/test';

test('Search, filter, and extract Amazon TV details', async ({ page }) => {
    test.setTimeout(120000);
    // STEP 1: Navigate to Amazon India
    console.log('1. Navigating to Amazon.in...');
    await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 10000, });
    // STEP 2: Search for TV
    console.log('2. Searching for "TV"...');
    const searchBox = page.locator('#twotabsearchtextbox');
    await expect(searchBox).toBeVisible({ timeout: 15000 });
    await searchBox.fill('TV');
    await searchBox.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.s-main-slot', { state: 'visible', timeout: 20000, });
    console.log('-> Search results loaded.');
    // STEP 3: Apply screen-size filter
    console.log('3. Applying screen-size filter: 50 Inches and/or 55 Inches...');
    const sizeLabels = ['50 Inches', '55 Inches'];
    let sizeFilterApplied = false;
    for (const size of sizeLabels) {
        const filter = page.locator('span').filter({ hasText: new RegExp(`^${size}$`, 'i') }).first();
        if (await filter.isVisible().catch(() => false)) {
            console.log(`   -> Applying ${size} filter...`);
            await filter.click();
            await page.waitForLoadState('domcontentloaded').catch(() => { });
            await page.waitForTimeout(3000);
            sizeFilterApplied = true;
            break;
        }
    }
    if (!sizeFilterApplied) {
        console.log(
            '   -> 50/55 Inches filter was not available. Continuing with current results.'
        );
    }
    // STEP 4: Select any two available brands
    console.log('4. Selecting two available TV brands...');
    const preferredBrands = ['Samsung', 'Sony'];
    let brandsSelected = 0;
    for (const brand of preferredBrands) {
        if (brandsSelected >= 2) {
            break;
        }
        const brandFilter = page
            .locator('span')
            .filter({ hasText: new RegExp(`^${brand}$`, 'i') })
            .first();
        if (await brandFilter.isVisible().catch(() => false)) {
            console.log(`   -> Selecting brand: ${brand}`);
            await brandFilter.click();
            await page.waitForLoadState('domcontentloaded').catch(() => { });
            await page.waitForTimeout(2500);
            brandsSelected++;
        } else {
            console.log(`   -> ${brand} filter is not available.`);
        }
    }
    if (brandsSelected < 2) {
        console.log('   -> Attempting to find additional available brands...');
        const possibleBrands = ['LG', 'OnePlus', 'TCL', 'Hisense', 'Acer', 'Xiaomi', 'Vu',];
        for (const brand of possibleBrands) {
            if (brandsSelected >= 2) {
                break;
            }
            const brandFilter = page
                .locator('span')
                .filter({ hasText: new RegExp(`^${brand}$`, 'i') })
                .first();
            if (await brandFilter.isVisible().catch(() => false)) {
                console.log(`   -> Selecting additional brand: ${brand}`);
                await brandFilter.click();
                await page.waitForLoadState('domcontentloaded').catch(() => { });
                await page.waitForTimeout(2000);
                brandsSelected++;
            }
        }
    }
    console.log(`   -> Total brands selected: ${brandsSelected}`);
    // STEP 5: Locate the first available TV
    console.log('5. Locating the first listed/recommended TV...');
    const productLinks = page.locator('.s-main-slot [data-component-type="s-search-result"] a[href*="/dp/"], ' + '.s-main-slot a[href*="/dp/"]');
    const productCount = await productLinks.count();
    if (productCount === 0) {
        throw new Error('No TV products were found in the filtered results.');
    }
    let productUrl: string | null = null;
    for (let i = 0; i < productCount; i++) {
        const link = productLinks.nth(i);
        const href = await link.getAttribute('href').catch(() => null);
        if (href && href.includes('/dp/')) {
            productUrl = href.startsWith('http')
                ? href : `https://www.amazon.in${href.startsWith('/') ? '' : '/'}${href}`;
            break;
        }
    }
    if (!productUrl) {
        throw new Error('Could not determine the first TV product URL.');
    }
    console.log(`   -> Product URL: ${productUrl}`);
    // STEP 6: Open the first TV
    console.log('6. Opening the first listed/recommended TV...');
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000, });
    await page.waitForSelector('#productTitle', { state: 'visible', timeout: 20000, });
    // STEP 7: Extract product title
    console.log('7. Extracting product title...');
    const title = (await page.locator('#productTitle').textContent().catch(() => null)
    )?.trim() || 'Title not found';
    // STEP 8: Extract price
    console.log('8. Extracting product price...');
    const priceSelectors = ['#corePriceDisplay_desktop_feature_div .a-offscreen', '#corePrice_feature_div .a-offscreen', '.apexPriceToPay .a-offscreen',
        '.priceToPay .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice',];
    let price = 'Price not found';
    for (const selector of priceSelectors) {
        const priceLocator = page.locator(selector).first();
        if (await priceLocator.isVisible().catch(() => false)) {
            const value = await priceLocator.textContent().catch(() => null);
            if (value?.trim()) {
                price = value.trim();
                break;
            }
        }
    }
    // STEP 9: Extract customer rating
    console.log('9. Extracting customer rating...');
    let rating = 'Rating not found';
    const ratingSelectors = ['#acrPopover', 'a[data-hook="average-star-rating"]', '[data-hook="average-star-rating"]',];
    for (const selector of ratingSelectors) {
        const ratingLocator = page.locator(selector).first();
        if (await ratingLocator.isVisible().catch(() => false)) {
            const titleAttribute = await ratingLocator
                .getAttribute('title')
                .catch(() => null);
            const text = await ratingLocator.textContent().catch(() => null);
            rating = titleAttribute?.trim() || text?.trim() || 'Rating not found';
            break;
        }
    }
    // STEP 10: Extract "About this item"
    console.log('10. Extracting "About this item" details...');
    const aboutItemSelectors = ['#feature-bullets ul li span.a-list-item',
        '#feature-bullets li', '#nic-po-expander-heading + div li',];
    let aboutItems: string[] = [];
    for (const selector of aboutItemSelectors) {
        const locator = page.locator(selector);
        if ((await locator.count()) > 0) {
            aboutItems = await locator.allTextContents();
            aboutItems = aboutItems
                .map((item) => item.replace(/\s+/g, ' ').trim())
                .filter(Boolean);
            if (aboutItems.length > 0) {
                break;
            }
        }
    }
    // STEP 11: Extract product specifications
    console.log('11. Extracting product specifications...');
    const specificationRows = page.locator(
        '#productDetails_techSpec_section_1 tr, ' +
        '#productDetails_detailBullets_sections1 tr, ' +
        '#prodDetails tr'
    );
    const specCount = await specificationRows.count();
    const specifications: string[] = [];
    for (let i = 0; i < specCount; i++) {
        const row = specificationRows.nth(i);
        const cells = await row.locator('th, td').allTextContents();
        const cleanCells = cells
            .map((cell) => cell.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        if (cleanCells.length > 0) {
            specifications.push(cleanCells.join(' : '));
        }
    }
    // STEP 12: Print all extracted information
    console.log('                 AMAZON TV PRODUCT DETAILS');
    console.log('\nPRODUCT TITLE');
    console.log(title);
    console.log('\nPRICE');
    console.log('-----');
    console.log(price);
    console.log('\nCUSTOMER RATING');
    console.log('---------------');
    console.log(rating);
    console.log('\nABOUT THIS ITEM');
    console.log('---------------');
    if (aboutItems.length > 0) {
        aboutItems.forEach((item, index) => {
            console.log(`${index + 1}. ${item}`);
        });
    } else {
        console.log('No "About this item" details found.');
    }
    console.log('\nPRODUCT SPECIFICATIONS / INFORMATION');
    console.log('------------------------------------');
    if (specifications.length > 0) {
        specifications.forEach((specification) => {
            console.log(`• ${specification}`);
        });
    } else {
        console.log('No product specifications found.');
    }
    console.log('                  END PRODUCT DETAILS');
});
