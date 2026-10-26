import crypto from "crypto";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
function getEnv(key) {
  const match = env.match(new RegExp(`^${key}="?([^"\\r\\n]+)"?`, "m"));
  return match ? match[1].trim() : "";
}

const cloudName = getEnv("CLOUDINARY_CLOUD_NAME") || "hdprt0zu";
const apiKey = getEnv("CLOUDINARY_API_KEY") || "244459676872437";
const apiSecret = getEnv("CLOUDINARY_API_SECRET") || "nXCA4KNLdF8SMoOJzb5axnKpJ1I";
const folder = "Landry_Media/profile";

async function run() {
  const fileBuf = fs.readFileSync("public/landry-a-propos.jpg");
  console.log("Original file size:", (fileBuf.length / 1024 / 1024).toFixed(2), "MB (" + fileBuf.length + " bytes)");

  const timestamp = Math.floor(Date.now() / 1000);
  const strToSign = `folder=${folder}&public_id=landry-kayoyo-portrait&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

  const blob = new Blob([fileBuf], { type: "image/jpeg" });
  const fd = new FormData();
  fd.append("file", blob, "landry-a-propos.jpg");
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);
  fd.append("public_id", "landry-kayoyo-portrait");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Cloudinary error:", data);
    return;
  }

  console.log("Uploaded successfully!");
  console.log("Raw URL:", data.secure_url);

  // Fetch optimized webp at 800px width
  const optimizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_webp,q_auto,w_800/${folder}/landry-kayoyo-portrait.webp`;
  console.log("Fetching optimized WebP:", optimizedUrl);
  const webpRes = await fetch(optimizedUrl);
  const webpBuf = Buffer.from(await webpRes.arrayBuffer());
  console.log("Optimized WebP size:", (webpBuf.length / 1024).toFixed(2), "KB (" + webpBuf.length + " bytes)");
  fs.writeFileSync("public/landry-a-propos.webp", webpBuf);

  // Fetch optimized jpg at 800px width
  const jpgUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_jpg,q_auto,w_800/${folder}/landry-kayoyo-portrait.jpg`;
  console.log("Fetching optimized JPG:", jpgUrl);
  const jpgRes = await fetch(jpgUrl);
  const jpgBuf = Buffer.from(await jpgRes.arrayBuffer());
  console.log("Optimized JPG size:", (jpgBuf.length / 1024).toFixed(2), "KB (" + jpgBuf.length + " bytes)");
  fs.writeFileSync("public/landry-a-propos.jpg", jpgBuf);

  console.log("\nReduction calculation:");
  console.log(`Original: ${(fileBuf.length / 1024).toFixed(1)} KB`);
  console.log(`Optimized WebP: ${(webpBuf.length / 1024).toFixed(1)} KB (-${((1 - webpBuf.length / fileBuf.length) * 100).toFixed(1)}%)`);
  console.log(`Optimized JPG: ${(jpgBuf.length / 1024).toFixed(1)} KB (-${((1 - jpgBuf.length / fileBuf.length) * 100).toFixed(1)}%)`);
}

run().catch(console.error);
