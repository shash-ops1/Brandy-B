const fs = require("fs");
const os = require("os");
const path = require("path");
const { bundle } = require("@remotion/bundler");
const {
  renderMedia,
  selectComposition,
} = require("@remotion/renderer");

const entryPoint = path.resolve(
  __dirname,
  "../../src/remotion/index.jsx"
);
const defaultBrowserExecutable =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const alternativeBrowserExecutables = [
  defaultBrowserExecutable,
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const RENDER_VERSION = "reel-render-v5-edge-with-audio";

let bundlePromise;

const getBundle = () => {
  if (process.env.NODE_ENV !== "production") {
    return bundle({
      entryPoint,
      onProgress: () => undefined,
    });
  }

  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint,
      onProgress: () => undefined,
    }).catch((error) => {
      bundlePromise = undefined;
      throw error;
    });
  }

  return bundlePromise;
};

const safeFileName = (value) =>
  (value || "brand")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "brand";

const renderReel = async (req, res) => {
  const {
    startupName,
    industry,
    targetAudience,
    description,
    logo,
    campaign,
  } = req.body;

  if (!startupName || !campaign?.scenes?.length) {
    return res.status(400).json({
      success: false,
      message: "Generate a complete reel campaign before rendering the video.",
    });
  }

  const browserExecutable =
    process.env.VIDEO_BROWSER_EXECUTABLE ||
    alternativeBrowserExecutables.find((executable) =>
      fs.existsSync(executable)
    );
  const outputLocation = path.join(
    os.tmpdir(),
    `${safeFileName(startupName)}-reel-${Date.now()}.mp4`
  );

  try {
    const serveUrl = await getBundle();
    const inputProps = {
      startupName,
      industry,
      targetAudience,
      description,
      logo: logo || "",
      campaign,
    };

    console.log("Rendering reel:", {
      startupName,
      browserExecutable,
      hasLogo: Boolean(logo),
      logo,
      sceneCount: campaign?.scenes?.length || 0,
      firstScene: campaign?.scenes?.[0] || null,
    });

    const composition = await selectComposition({
      serveUrl,
      id: "BrandReel",
      inputProps,
      browserExecutable,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      browserExecutable,
      crf: 18,
      concurrency: 2,
      audioCodec: "aac",
      numberOfAudioChannels: 2,
      sampleRate: 48000,
    });

    res.setHeader("X-Render-Version", RENDER_VERSION);

    return res.download(
      outputLocation,
      `${safeFileName(startupName)}-brand-reel.mp4`,
      (error) => {
        fs.promises.unlink(outputLocation).catch(() => undefined);

        if (error && !res.headersSent) {
          res.status(500).json({
            success: false,
            message: "The rendered video could not be downloaded.",
          });
        }
      }
    );
  } catch (error) {
    fs.promises.unlink(outputLocation).catch(() => undefined);
    console.error("Reel rendering failed:", error);

    return res.status(500).json({
      success: false,
      message:
        "The MP4 render failed. Check that Chrome is installed and restart the backend.",
    });
  }
};

module.exports = {
  renderReel,
  RENDER_VERSION,
};
