import fs from "fs";
import http from "http";
const urls = [
  "http://localhost:3050/predicted?company=google&role=Research%20Intern",
  "http://localhost:3050/company/google",
  "http://localhost:3050/leaderboard",
];
for (const url of urls) {
  const html = await new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body));
    }).on("error", reject);
  });
  const path = process.env.TEMP || process.env.TMP || "C:/Users/antriksh/AppData/Local/Temp";
  const name = "page-" + url.split("/").pop().split("?")[0] + ".html";
  fs.writeFileSync(path + "/" + name, html);
  const signals = {
    score: (html.match(/score/g) || []).length,
    asked_this_cycle: (html.match(/asked this cycle/g) || []).length,
    hot_topic: (html.match(/hot topic/g) || []).length,
    rotation: (html.match(/rotation window/g) || []).length,
    reported: (html.match(/reported \d+×/g) || []).length,
  };
  console.log(url, "→", JSON.stringify(signals));
}
