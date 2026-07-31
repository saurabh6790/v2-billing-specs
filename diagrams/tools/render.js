const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const SRC = path.resolve(__dirname, "..");

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	page.on("console", (m) => m.type() === "error" && console.error("  page:", m.text()));

	await page.setContent(`<!doctype html><html><body><script>${fs.readFileSync(
		path.join(__dirname, "bundle.js"),
		"utf8",
	)}<\/script></body></html>`);
	await page.waitForFunction(() => window.ready === true, { timeout: 60000 });
	// Excalifont is inlined in the bundle; let the browser finish loading it before
	// any text is measured, or every label is laid out against a fallback metric.
	await page.evaluate(() => document.fonts.ready);

	let ok = 0;
	for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".mmd")).sort()) {
		const slug = path.basename(file, ".mmd");
		const definition = fs.readFileSync(path.join(SRC, file), "utf8");
		try {
			const svg = await page.evaluate((d) => window.renderDiagram(d), definition);
			fs.writeFileSync(path.join(SRC, `${slug}.svg`), svg);
			console.log(`  ok   ${slug}.svg  ${(svg.length / 1024).toFixed(0)}kb`);
			ok++;
		} catch (error) {
			console.error(`  FAIL ${slug}: ${String(error).split("\n")[0]}`);
		}
	}
	console.log(`\n${ok} rendered`);
	await browser.close();
})();
