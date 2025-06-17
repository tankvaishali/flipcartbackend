import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { PDFDocument } from "pdf-lib";
import { user } from "../../Mongodb/Meeshoconnect.js";

const Postmeesho = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/meesho/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

let labelCounter = 1;

Postmeesho.post("/", upload.array("files", 10), async (req, res) => {
    try {
        let savedFiles = [];

        for (const file of req.files) {
            const filePath = file.path;
            const existingPdfBytes = fs.readFileSync(filePath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const totalPages = pdfDoc.getPageCount();

            const pdfDocBarcode = await PDFDocument.create();
            const pdfDocInvoice = await PDFDocument.create();

            for (let i = 0; i < totalPages; i++) {
                const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
                const { width, height } = page.getSize();

                const embeddedPage1 = await pdfDocBarcode.embedPage(page);
                const barcodePage = pdfDocBarcode.addPage([width, height / 1.52]);
                barcodePage.drawPage(embeddedPage1, {
                    x: 0,
                    y: -(height / 1.52),
                    width: width,
                    height: height,
                });

                const embeddedPage2 = await pdfDocInvoice.embedPage(page);
                const invoicePage = pdfDocInvoice.addPage([width, height / 1.52]);
                invoicePage.drawPage(embeddedPage2, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            }

            // Create local Desktop folder
            const desktopBase = path.join(os.homedir(), "Desktop", "MeeshoLables");
            const desktopFolder = path.join(desktopBase, `meesho-Lable_${labelCounter}`);
            fs.mkdirSync(desktopFolder, { recursive: true });

            // Create public uploads folder
            const uploadBase = path.join("uploads", "meesho", `meesho-Lable_${labelCounter}`);
            fs.mkdirSync(uploadBase, { recursive: true });

            const part1DesktopPath = path.join(desktopFolder, "part1.pdf");
            const part2DesktopPath = path.join(desktopFolder, "part2.pdf");

            const part1UploadPath = path.join(uploadBase, "part1.pdf");
            const part2UploadPath = path.join(uploadBase, "part2.pdf");

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            // Save to Desktop
            fs.writeFileSync(part1DesktopPath, barcodeBytes);
            fs.writeFileSync(part2DesktopPath, invoiceBytes);

            // Save to uploads folder for Render hosting
            fs.writeFileSync(part1UploadPath, barcodeBytes);
            fs.writeFileSync(part2UploadPath, invoiceBytes);

            const saved = await user.create({
                part1: part1UploadPath.replace("uploads/", ""), // so it can be accessed via /uploads/
                part2: part2UploadPath.replace("uploads/", "")
            });

            savedFiles.push(saved);
            labelCounter++;
        }

        res.json({
            message: "All files split and saved to Desktop and server uploads",
            data: savedFiles
        });

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).send("Error processing files");
    }
});

export default Postmeesho;
