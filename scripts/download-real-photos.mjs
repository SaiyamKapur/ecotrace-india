import fs from "fs";
import https from "https";
import path from "path";

const imagesToDownload = [
  {
    name: "premium-hero.jpg",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=85",
  },
  {
    name: "sample-multidevice.jpg",
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "tablet-sample.jpg",
    url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "listing-laptop.jpg",
    url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "listing-phone.jpg",
    url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "listing-monitor.jpg",
    url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "listing-cables.jpg",
    url: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "ewaste-facility.jpg",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85",
  },
];

const outDir = path.resolve("public/images");
fs.mkdirSync(outDir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          download(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(dest);
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          console.log(`Saved ${dest} (${fs.statSync(dest).size} bytes)`);
          resolve();
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function run() {
  for (const item of imagesToDownload) {
    const dest = path.join(outDir, item.name);
    console.log(`Downloading ${item.name}...`);
    await download(item.url, dest);
  }
  console.log("All photos downloaded successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
