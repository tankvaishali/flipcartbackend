// /Api/Amazon/Postdata.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { amazon } = require("../../Mongodb/AmazonConnection");
const pdfParse = require("pdf-parse");

const Postdata = express.Router();

// Create uploads folder if not exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Get OneDrive or normal Desktop path
function getDesktopPath() {
    const home = os.homedir();
    const oneDriveDesktop = path.join(home, "OneDrive", "Desktop");
    const normalDesktop = path.join(home, "Desktop");
    if (fs.existsSync(oneDriveDesktop)) return oneDriveDesktop;
    if (fs.existsSync(normalDesktop)) return normalDesktop;
    throw new Error("❌ Desktop path not found.");
}

// Extract product code like `ABCD1234 (`
function extractProductCode(text) {
    const match = text.match(/([A-Z0-9]{8,15})\s*\(/);
    return match ? match[1] : "PRODUCT-NOT-FOUND";
}

// Extract something like `(ABC-DE-FG-12)`
function extractBracketCode(text) {
    const combined = text.replace(/\r?\n|\r/g, " ");
    const match = combined.match(/\b([A-Z]{2,}-[A-Z]{2,}-[A-Z]{2,}-[A-Z0-9]{2,})\b/);
    return match ? `(${match[1]})` : "(CODE-NOT-FOUND)";
}

// 🚀 POST route
Postdata.post("/", upload.array("files", 10), async (req, res) => {
    try {
        const savedFiles = [];
        const desktopPath = getDesktopPath();
        const outputDir = path.join(desktopPath, "AmazonLabels");

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        for (const file of req.files) {
            const filePath = file.path;
            if (!fs.existsSync(filePath)) continue;

            const pdfBytes = fs.readFileSync(filePath);
            const originalPdf = await PDFDocument.load(pdfBytes);

            // Extract real text using pdf-parse
            const pdfData = await pdfParse(pdfBytes);
            const productCode = extractProductCode(pdfData.text);
            const bracketCode = extractBracketCode(pdfData.text);
            const insertText = `${productCode} ${bracketCode}`;

            // Part 1 PDF (Page 1 + text)
            const pdfPart1 = await PDFDocument.create();
            const [page1] = await pdfPart1.copyPages(originalPdf, [0]);
            pdfPart1.addPage(page1);

            const font = await pdfPart1.embedFont(StandardFonts.HelveticaBold);
            const firstPage = pdfPart1.getPage(0);
            firstPage.drawText(insertText, {
                x: 80,
                y: 175,
                size: 12,
                font,
                color: rgb(0, 0, 0),
            });

            // Part 2 PDF (Page 2 only)
            const pdfPart2 = await PDFDocument.create();
            const [page2] = await pdfPart2.copyPages(originalPdf, [1]);
            pdfPart2.addPage(page2);

            // Save files
            const baseName = path.basename(file.originalname, path.extname(file.originalname));
            const part1Path = path.join(outputDir, `${baseName}-part1.pdf`);
            const part2Path = path.join(outputDir, `${baseName}-part2.pdf`);

            fs.writeFileSync(part1Path, await pdfPart1.save());
            fs.writeFileSync(part2Path, await pdfPart2.save());

            // Save in DB
            const saved = await amazon.create({ part1: part1Path, part2: part2Path });
            savedFiles.push(saved);
        }

        exec(`start "" "${outputDir}"`);
        res.json({
            message: "✅ PDF files processed & saved to AmazonLabels",
            folder: outputDir,
            data: savedFiles,
        });

    } catch (err) {
        console.error("🔥 Error:", err);
        res.status(500).send("Error processing PDF files");
    }
});

module.exports = Postdata;
