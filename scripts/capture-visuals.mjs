// Node.js script to control Chrome via CDP and take screenshots of element card and table
import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const ARTIFACT_DIR = "/Users/han/.gemini/antigravity-ide/brain/efec6d9d-1cd1-468f-a53d-abe63aafe735";

async function main() {
  console.log("Launching headless Chrome on port", PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,900"
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await listRes.json();
    const wsUrl = targets[0]?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error("No websocket url found");

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg.result);
        callbacks.delete(msg.id);
      }
    };

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => ws.onopen = resolve);

    await send("Page.enable");
    await send("Runtime.enable");

    console.log("Navigating to http://127.0.0.1:5174/ ...");
    await send("Page.navigate", { url: "http://127.0.0.1:5174/" });
    await new Promise(r => setTimeout(r, 1500));

    // Test 1: Light Theme - Open Cu Card (Exact match for user screenshot condition)
    console.log("Setting Light Theme and opening Cu card...");
    await send("Runtime.evaluate", {
      expression: `
        window.app.header.setTheme("light");
        window.app.header.setLanguage("zh");
        window.app.elementCard.open("Cu");
      `
    });
    await new Promise(r => setTimeout(r, 800));

    const shot1 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${ARTIFACT_DIR}/cu_card_light_fixed.png`, Buffer.from(shot1.data, "base64"));
    console.log("Captured cu_card_light_fixed.png");

    // Test 2: Dark Theme - Open Cu Card
    console.log("Setting Dark Theme and opening Cu card...");
    await send("Runtime.evaluate", {
      expression: `
        window.app.header.setTheme("dark");
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const shot2 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${ARTIFACT_DIR}/cu_card_dark_fixed.png`, Buffer.from(shot2.data, "base64"));
    console.log("Captured cu_card_dark_fixed.png");

    // Test 3: Close Card, hover over Fe (Iron) to see legend preview with Pinyin & IPA
    console.log("Closing card and updating legend with Fe...");
    await send("Runtime.evaluate", {
      expression: `
        window.app.elementCard.close();
        window.app.periodicTable.updateLegend("Fe");
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const shot3 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${ARTIFACT_DIR}/table_legend_fe_dark.png`, Buffer.from(shot3.data, "base64"));
    console.log("Captured table_legend_fe_dark.png");

    // Test 4: Light Theme legend preview
    console.log("Setting light theme for table legend...");
    await send("Runtime.evaluate", {
      expression: `
        window.app.header.setTheme("light");
        window.app.periodicTable.updateLegend("Cu");
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const shot4 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${ARTIFACT_DIR}/table_legend_cu_light.png`, Buffer.from(shot4.data, "base64"));
    console.log("Captured table_legend_cu_light.png");

    // Test 5: English Mode - Cu Card
    console.log("Switching to English and opening Cu Card...");
    await send("Runtime.evaluate", {
      expression: `
        window.app.header.setLanguage("en");
        window.app.elementCard.open("Cu");
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const shot5 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${ARTIFACT_DIR}/cu_card_en_light.png`, Buffer.from(shot5.data, "base64"));
    console.log("Captured cu_card_en_light.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
