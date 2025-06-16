// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import { PDFDocument } from "pdf-lib";
// import { amazon } from "../../Mongodb/AmazonConnection.js";

// const Postdata = express.Router();

// // Ensure uploads folder exists
// const uploadDir = "uploads";
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir);
// }

// // Multer config
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, uploadDir);
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + "-" + file.originalname);
//     }
// });

// const upload = multer({ storage });

// // Route to handle PDF splitting
// Postdata.post("/", upload.array("files", 10), async (req, res) => {
//     try {
//         let savedFiles = [];

//         for (const file of req.files) {
//             const filePath = file.path;
//             const existingPdfBytes = fs.readFileSync(filePath);
//             const pdfDoc = await PDFDocument.load(existingPdfBytes);
//             const totalPages = pdfDoc.getPageCount();

//             const pdfDocBarcode = await PDFDocument.create(); // top half
//             const pdfDocInvoice = await PDFDocument.create(); // bottom half

//             for (let i = 0; i < totalPages; i++) {
//                 const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
//                 const { width, height } = page.getSize();
//                 const halfHeight = height / 2;

//                 // --- TOP HALF (Barcode) ---
//                 const embeddedTop = await pdfDocBarcode.embedPage(page);
//                 const topPage = pdfDocBarcode.addPage([width, halfHeight]);
//                 topPage.drawPage(embeddedTop, {
//                     x: 0,
//                     y: -halfHeight,
//                     width: width,
//                     height: height
//                 });

//                 // --- BOTTOM HALF (Invoice) ---
//                 const embeddedBottom = await pdfDocInvoice.embedPage(page);
//                 const bottomPage = pdfDocInvoice.addPage([width, halfHeight]);
//                 bottomPage.drawPage(embeddedBottom, {
//                     x: 0,
//                     y: 0,
//                     width: width,
//                     height: height
//                 });
//             }

//             const timestamp = Date.now();
//             const originalName = path.basename(file.originalname, path.extname(file.originalname));

//             const barcodePath = `${uploadDir}/barcode-${timestamp}-${originalName}.pdf`;
//             const invoicePath = `${uploadDir}/invoice-${timestamp}-${originalName}.pdf`;

//             const barcodeBytes = await pdfDocBarcode.save();
//             const invoiceBytes = await pdfDocInvoice.save();

//             fs.writeFileSync(barcodePath, barcodeBytes);
//             fs.writeFileSync(invoicePath, invoiceBytes);

//             const saved = await amazon.create({
//                 part1: barcodePath,
//                 part2: invoicePath
//             });

//             savedFiles.push(saved);
//         }

//         res.status(200).json({
//             message: "All files uploaded and split successfully",
//             data: savedFiles
//         });

//     } catch (err) {
//         console.error("Error while processing files:", err);
//         res.status(500).send("Error processing files");
//     }
// });

// export default Postdata;


import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { amazon } from "../../Mongodb/AmazonConnection.js";

const Postdata = express.Router();

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Route: Split PDF into 2 files (page 1 → part1, page 2 → part2)
Postdata.post("/", upload.array("files", 10), async (req, res) => {
    try {
        let savedFiles = [];

        for (const file of req.files) {
            const filePath = file.path;
            const pdfBytes = fs.readFileSync(filePath);
            const originalPdf = await PDFDocument.load(pdfBytes);

            const pageCount = originalPdf.getPageCount();
            if (pageCount < 2) {
                return res.status(400).json({ message: "Each PDF must have at least 2 pages" });
            }

            const pdfPart1 = await PDFDocument.create();
            const pdfPart2 = await PDFDocument.create();

            const [page1] = await pdfPart1.copyPages(originalPdf, [0]);
            pdfPart1.addPage(page1);

            const [page2] = await pdfPart2.copyPages(originalPdf, [1]);
            pdfPart2.addPage(page2);

            const timestamp = Date.now();
            const originalName = path.basename(file.originalname, path.extname(file.originalname));

            const part1Path = `${uploadDir}/part1-${timestamp}-${originalName}.pdf`;
            const part2Path = `${uploadDir}/part2-${timestamp}-${originalName}.pdf`;

            const part1Bytes = await pdfPart1.save();
            const part2Bytes = await pdfPart2.save();

            fs.writeFileSync(part1Path, part1Bytes);
            fs.writeFileSync(part2Path, part2Bytes);

            const saved = await amazon.create({
                part1: part1Path,
                part2: part2Path
            });

            savedFiles.push(saved);
        }

        res.json({ message: "Files split into part1 and part2 successfully", data: savedFiles });

    } catch (err) {
        console.error("Error while processing PDFs:", err);
        res.status(500).send("Error processing PDF files");
    }
});

export default Postdata;
