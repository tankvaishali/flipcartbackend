// // import express from "express";
// // import multer from "multer";
// // import fs from "fs";
// // import path from "path";
// // import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// // import { amazon } from "../../Mongodb/AmazonConnection.js";
// // import pdfParse from "pdf-parse";

// // const Postdata = express.Router();

// // // Ensure uploads directory exists
// // const uploadDir = "uploads";
// // if (!fs.existsSync(uploadDir)) {
// //     fs.mkdirSync(uploadDir);
// // }

// // // Multer config
// // const storage = multer.diskStorage({
// //     destination: (req, file, cb) => cb(null, uploadDir),
// //     filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
// // });
// // const upload = multer({ storage });

// // // POST Route
// // Postdata.post("/", upload.array("files", 10), async (req, res) => {
// //     try {
// //         const savedFiles = [];

// //         for (const file of req.files) {
// //             const filePath = file.path;

// //             // File exists check
// //             if (!fs.existsSync(filePath)) {
// //                 console.error("❌ File not found:", filePath);
// //                 continue;
// //             }

// //             const pdfBytes = fs.readFileSync(filePath);
// //             const originalPdf = await PDFDocument.load(pdfBytes);

// //             // Extract text from PDF
// //             const pdfData = await pdfParse(pdfBytes);

// //             // Extract product code (e.g., B0CKTJ4R3T)
// //             const productMatch = pdfData.text.match(/([A-Z0-9]{8,15})\s*\(/);
// //             const productCode = productMatch ? productMatch[1] : "PRODUCT-NOT-FOUND";

// //             // Extract correct bracketed code like (HO-EB-GV-PK3)
// //             const allBracketMatches = [...pdfData.text.matchAll(/\(([^)]+)\)/g)];
// //             let bracketCode = "(CODE-NOT-FOUND)";

// //             for (const match of allBracketMatches) {
// //                 let value = match[1].trim().replace(/[–—]/g, '-'); // Replace weird dashes with normal dash

// //                 // Looser check for 4-part codes (like HO-EB-GV-PK3)
// //                 if (
// //                     value.includes("-") &&
// //                     value.split("-").length >= 4 &&
// //                     /^[A-Z0-9\-]+$/.test(value)
// //                 ) {
// //                     bracketCode = `(${value})`;
// //                     break;
// //                 }
// //             }

// //             const insertText = `${productCode} ${bracketCode}`;
// //             console.log(`📄 ${file.originalname} ➤ ${insertText}`);

// //             // Create part1 and part2 PDFs
// //             const pdfPart1 = await PDFDocument.create();
// //             const pdfPart2 = await PDFDocument.create();

// //             const [page1] = await pdfPart1.copyPages(originalPdf, [0]);
// //             pdfPart1.addPage(page1);

// //             const [page2] = await pdfPart2.copyPages(originalPdf, [1]);
// //             pdfPart2.addPage(page2);

// //             // Embed font and insert text on part1
// //             const font = await pdfPart1.embedFont(StandardFonts.HelveticaBold);
// //             const firstPage = pdfPart1.getPage(0);
// //             firstPage.drawText(insertText, {
// //                 x: 80,
// //                 y: 175,
// //                 size: 12,
// //                 font,
// //                 color: rgb(0, 0, 0),
// //             });

// //             const timestamp = Date.now();
// //             const originalName = path.basename(file.originalname, path.extname(file.originalname));
// //             const part1Path = path.join(uploadDir, `part1-${timestamp}-${originalName}.pdf`);
// //             const part2Path = path.join(uploadDir, `part2-${timestamp}-${originalName}.pdf`);

// //             fs.writeFileSync(part1Path, await pdfPart1.save());
// //             fs.writeFileSync(part2Path, await pdfPart2.save());

// //             const saved = await amazon.create({
// //                 part1: part1Path,
// //                 part2: part2Path,
// //             });

// //             savedFiles.push(saved);
// //         }

// //         res.json({ message: "PDF processed successfully", data: savedFiles });
// //     } catch (err) {
// //         console.error("🔥 PDF Processing Error:", err);
// //         res.status(500).send("Error processing PDF files");
// //     }
// // });

// // export default Postdata;



// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// import { amazon } from "../../Mongodb/AmazonConnection.js";
// import pdfParse from "pdf-parse";

// const Postdata = express.Router();

// // Ensure uploads directory exists
// const uploadDir = "uploads";
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir);
// }

// // Multer config
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, uploadDir),
//     filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
// });
// const upload = multer({ storage });

// // --- 🧠 Modular Functions ---

// function extractProductCode(text) {
//     const match = text.match(/([A-Z0-9]{8,15})\s*\(/);
//     return match ? match[1] : "PRODUCT-NOT-FOUND";
// }

// function extractBracketCode(text) {
//     // Join all lines into one string to avoid split brackets
//     const combinedText = text.replace(/\r?\n|\r/g, " ");

//     const matches = [...combinedText.matchAll(/\(([^)]+)\)/g)];

//     const codeMatch = combinedText.match(/\b([A-Z]{2,}-[A-Z]{2,}-[A-Z]{2,}-[A-Z0-9]{2,})\b/);

//     return codeMatch ? `(${codeMatch[1]})` : "(CODE-NOT-FOUND)";

// }

// // --- 🚀 POST Route ---
// Postdata.post("/", upload.array("files", 10), async (req, res) => {
//     try {
//         const savedFiles = [];

//         for (const file of req.files) {
//             const filePath = file.path;

//             if (!fs.existsSync(filePath)) {
//                 console.error("❌ File not found:", filePath);
//                 continue;
//             }

//             const pdfBytes = fs.readFileSync(filePath);
//             const originalPdf = await PDFDocument.load(pdfBytes);

//             // Extract text
//             const pdfData = await pdfParse(pdfBytes);
//             const productCode = extractProductCode(pdfData.text);
//             const bracketCode = extractBracketCode(pdfData.text);
//             const insertText = `${productCode} ${bracketCode}`;
//             console.log(`📄 ${file.originalname} ➤ ${insertText}`);

//             // Create Part 1
//             const pdfPart1 = await PDFDocument.create();
//             const [page1] = await pdfPart1.copyPages(originalPdf, [0]);
//             pdfPart1.addPage(page1);

//             const font = await pdfPart1.embedFont(StandardFonts.HelveticaBold);
//             const firstPage = pdfPart1.getPage(0);
//             firstPage.drawText(insertText, {
//                 x: 80,
//                 y: 175,
//                 size: 12,
//                 font,
//                 color: rgb(0, 0, 0),
//             });

//             // Create Part 2
//             const pdfPart2 = await PDFDocument.create();
//             const [page2] = await pdfPart2.copyPages(originalPdf, [1]);
//             pdfPart2.addPage(page2);

//             const timestamp = Date.now();
//             const originalName = path.basename(file.originalname, path.extname(file.originalname));
//             const part1Path = path.join(uploadDir, `part1-${timestamp}-${originalName}.pdf`);
//             const part2Path = path.join(uploadDir, `part2-${timestamp}-${originalName}.pdf`);

//             fs.writeFileSync(part1Path, await pdfPart1.save());
//             fs.writeFileSync(part2Path, await pdfPart2.save());

//             const saved = await amazon.create({
//                 part1: part1Path,
//                 part2: part2Path,
//             });

//             savedFiles.push(saved);
//         }

//         res.json({ message: "PDF processed successfully", data: savedFiles });
//     } catch (err) {
//         console.error("🔥 PDF Processing Error:", err);
//         res.status(500).send("Error processing PDF files");
//     }
// });

// export default Postdata;
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

// Create uploads folder if not exist
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

// 🔧 Get OneDrive Desktop Path (fallback to normal Desktop)
function getOneDriveDesktopPath() {
    const homeDir = os.homedir();
    const oneDriveDesktop = path.join(homeDir, "OneDrive", "Desktop");
    const normalDesktop = path.join(homeDir, "Desktop");

    if (fs.existsSync(oneDriveDesktop)) return oneDriveDesktop;
    if (fs.existsSync(normalDesktop)) return normalDesktop;

    throw new Error("❌ Desktop path not found on this system.");
}

// 🧠 Text Extract Helpers
function extractProductCode(text) {
    const match = text.match(/([A-Z0-9]{8,15})\s*\(/);
    return match ? match[1] : "PRODUCT-NOT-FOUND";
}

function extractBracketCode(text) {
    const combinedText = text.replace(/\r?\n|\r/g, " ");
    const codeMatch = combinedText.match(/\b([A-Z]{2,}-[A-Z]{2,}-[A-Z]{2,}-[A-Z0-9]{2,})\b/);
    return codeMatch ? `(${codeMatch[1]})` : "(CODE-NOT-FOUND)";
}

// 🚀 POST / Route
Postdata.post("/", upload.array("files", 10), async (req, res) => {
    try {
        const savedFiles = [];

        // 📁 Final path = OneDrive/Desktop/AmazonLabels
        const desktopPath = getOneDriveDesktopPath();
        const outputDir = path.join(desktopPath, "AmazonLabels");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const file of req.files) {
            const filePath = file.path;
            if (!fs.existsSync(filePath)) continue;

            const pdfBytes = fs.readFileSync(filePath);
            const originalPdf = await PDFDocument.load(pdfBytes);

            const pdfData = await pdfParse(pdfBytes);
            const productCode = extractProductCode(pdfData.text);
            const bracketCode = extractBracketCode(pdfData.text);
            const insertText = `${productCode} ${bracketCode}`;

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

            const pdfPart2 = await PDFDocument.create();
            const [page2] = await pdfPart2.copyPages(originalPdf, [1]);
            pdfPart2.addPage(page2);

            const baseName = path.basename(file.originalname, path.extname(file.originalname));
            const part1Path = path.join(outputDir, `${baseName}-part1.pdf`);
            const part2Path = path.join(outputDir, `${baseName}-part2.pdf`);

            fs.writeFileSync(part1Path, await pdfPart1.save());
            fs.writeFileSync(part2Path, await pdfPart2.save());

            const saved = await amazon.create({ part1: part1Path, part2: part2Path });
            savedFiles.push(saved);
        }

        // ✅ Open folder in Windows Explorer
        exec(`start "" "${outputDir}"`);

        res.json({
            message: "✅ PDF saved to OneDrive/Desktop/AmazonLabels",
            folder: outputDir,
            data: savedFiles,
        });

    } catch (err) {
        console.error("🔥 Error:", err);
        res.status(500).send("Error processing PDF files");
    }
});

module.exports = Postdata;

