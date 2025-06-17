import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { user } from "../../Mongodb/Meeshoconnect.js";

const Postmeesho = express.Router();

// Setup Multer for file uploads
const storage = multer.diskStorage({});

const upload = multer({ storage });

// Counter for folder labels
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

                const embeddedPage = await pdfDocBarcode.embedPage(page);
                const barcodePage = pdfDocBarcode.addPage([width, height / 1.52]);
                barcodePage.drawPage(embeddedPage, {
                    x: 0,
                    y: -(height / 1.52),
                    width: width,
                    height: height
                });

                const embeddedPage2 = await pdfDocInvoice.embedPage(page);
                const invoicePage = pdfDocInvoice.addPage([width, height / 1.52]);
                invoicePage.drawPage(embeddedPage2, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });
            }

            // Generate Desktop path and folder
            const desktopPath = path.join("C:/Users/HP/OneDrive/Desktop/MeeshoLables");
            if (!fs.existsSync(desktopPath)) {
                fs.mkdirSync(desktopPath, { recursive: true });
            }

            const folderName = `meesho-Lable_${labelCounter++}`;
            const finalFolderPath = path.join(desktopPath, folderName);
            fs.mkdirSync(finalFolderPath, { recursive: true });

            const part1Path = path.join(finalFolderPath, "part1.pdf");
            const part2Path = path.join(finalFolderPath, "part2.pdf");

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            fs.writeFileSync(part1Path, barcodeBytes);
            fs.writeFileSync(part2Path, invoiceBytes);

            const saved = await user.create({ part1: part1Path, part2: part2Path });
            savedFiles.push(saved);
        }

        res.json({ message: "All files cropped & saved on Desktop (Meesho)", data: savedFiles });

    } catch (err) {
        console.error("❌ Error processing files:", err);
        res.status(500).send("Error processing PDF files");
    }
});

export default Postmeesho;
