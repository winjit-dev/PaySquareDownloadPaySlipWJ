const puppeteer = require("puppeteer");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");

const SITE = "https://mypayroll.paysquare.com/";

const args = process.argv.slice(2);
// if (!credentials.username || !credentials.password) {
if (args.length < 2) {
  console.error(
    chalk.red(
      new Error(
        "Username and password not provided. \nSet env var PSQUName for username and PSQPswd for password."
      )
    )
  );
  process.exit(0);
}

const credentials = {
  username: args[0],
  password: args[1],
};

const headless = (args.length == 3 && args[2] == '--show') ? false : true;
// console.log(headless, (args.length == 3 && args[2] == '--show'));

// process.exit(0);

const usernameSelector = "[id='ctl03_txtuser']";
const passwordSelector = "[id='ctl03_txtpassword']";
const loginButtonSelector = "[id='ctl03_btnLogin']";

const _menuSelector = "ul.ng-scope > li:nth-child(5) > a:nth-child(1)";
const monthOptionsSelector =
  "#widget-grid > div:nth-child(1) > article:nth-child(1) > div > div:nth-child(2) > div > section:nth-child(1) > label > select > option";
const monthSelector =
  "#widget-grid > div:nth-child(1) > article:nth-child(1) > div > div:nth-child(2) > div > section:nth-child(1) > label > select";
const payslipSelector =
  "#widget-grid > div:nth-child(1) > article:nth-child(1) > div > div:nth-child(4) > div > div > div:nth-child(4) > div > h3 > a";

(async () => {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: headless });
    const page = (await browser.pages())[0];
    await page.setViewport({
      width: 1353,
      height: 890,
    });
    console.log(chalk.green("Window Created"));
    await loginToPaysquare(page);
    console.log(chalk.blue("Authenticated!"));
    await processMonthList(page);
    browser.close();
  } catch (err) {
    console.log(chalk.red("Error", err));
  }
})();

async function processMonthList(page) {
  try {
    const options = await page.$$eval(monthOptionsSelector, options =>
      options.map(option => option.value)
    );
    for (const option of options) {
      await selectAndDownloadPaySlip(page, option);
    }
  } catch (error) {
    throw error;
  }
}

async function waitForFileToDownload(page, downloadPath, filenameSearch) {
  console.log("Waiting to download file...");
  let filename;
  while (!filename || filename.endsWith(".crdownload")) {
    filename = fs.readdirSync(downloadPath).filter(name => name.includes(filenameSearch))[0];
    await page.waitFor(500);
  }
  return filename;
}

async function selectAndDownloadPaySlip(page, value) {
  try {
    await page.select(monthSelector, value);
    await page.waitFor(500);
    try {
      const filename = await page.$eval(payslipSelector, res => {
        console.log(res);
        return res.text;
      });
      const downloadPath = path.resolve(__dirname, "download");
      await page._client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadPath,
      });
      await page.click(payslipSelector);
      await waitForFileToDownload(page, downloadPath, filename.trim());
      console.log(chalk.greenBright(`Done: ${filename}`));
    } catch (error) {}
  } catch (error) {
    throw error;
  }
}

async function loginToPaysquare(page) {
  try {
    //   const credentials = JSON.parse(process.env.CREDENTIALS_USER_MICROSOFT);

    await page.goto(SITE);
    // //*[@id="ctl03_txtuser"]
    await page.waitForSelector(usernameSelector, { visible: true });
    // await page.waitForSelector("[id='ctl03_txtuser']", { visible: true });
    // await page.click("[id='ctl03_txtuser']")
    // await page.click(usernameSelector);
    await page.type(usernameSelector, credentials.username);
    // await page.click(passwordSelector);
    await page.type(passwordSelector, credentials.password);
    await page.click(loginButtonSelector);
    await page.waitForSelector(_menuSelector, { visible: true });
    await page.screenshot({ path: "paysquare.png" });
  } catch (err) {
    throw err;
  }
}

/* await page.evaluate(({ creds, selectors }) => {
        // const ipemail = document.getElementById(escape("#ctl03_txtuser"));
        const ipemail = document.getElementById(escape(selectors.usernameSelector));
        const ippswd = document.getElementById(escape("#ctl03_txtpassword"));
        const loginButton = document.getElementById(escape("#ctl03_btnLogin"));
        ipemail.value = creds.username;
        ipemail.dispatchEvent(new Event('input'));
        ippswd.value = creds.password;
        ippswd.dispatchEvent(new Event('input'));
        loginButton.dispatchEvent(new Event('click'));
    }, {
      creds: credentials,
      selectors: { usernameSelector, passwordSelector, loginButtonSelector },
    }); */
