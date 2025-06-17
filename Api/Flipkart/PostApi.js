import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { user } from "../../Mongodb/Flipkartconnect.js";

const Postdata = express.Router();

// Multer config (no destination = handled by system temp)
const storage = multer.diskStorage({});
const upload = multer({ storage });

let labelCounter = 1;

Postdata.post("/", upload.array("files", 10), async (req, res) => {
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

                // Bottom crop (part1)
                const embeddedPage = await pdfDocBarcode.embedPage(page);
                const barcodePage = pdfDocBarcode.addPage([width, height / 1.84]);
                barcodePage.drawPage(embeddedPage, {
                    x: 0,
                    y: -(height / 1.84),
                    width: width,
                    height: height,
                });

                // Top crop (part2)
                const embeddedPage2 = await pdfDocInvoice.embedPage(page);
                const invoicePage = pdfDocInvoice.addPage([width, height / 1.84]);
                invoicePage.drawPage(embeddedPage2, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            }

            // Folder on Desktop
            const desktopPath = path.join("C:/Users/HP/OneDrive/Desktop/FlipkartLables");
            if (!fs.existsSync(desktopPath)) {
                fs.mkdirSync(desktopPath, { recursive: true });
            }

            const folderName = `flipkart-Lable_${labelCounter++}`;
            const finalFolderPath = path.join(desktopPath, folderName);
            fs.mkdirSync(finalFolderPath, { recursive: true });

            const barcodePath = path.join(finalFolderPath, "part1.pdf");
            const invoicePath = path.join(finalFolderPath, "part2.pdf");

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            fs.writeFileSync(barcodePath, barcodeBytes);
            fs.writeFileSync(invoicePath, invoiceBytes);

            const saved = await user.create({ part1: barcodePath, part2: invoicePath });
            savedFiles.push(saved);
        }

        res.json({ message: "All files cropped & saved on Desktop (Flipkart)", data: savedFiles });

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).send("Error processing files");
    }
});

export default Postdata;
