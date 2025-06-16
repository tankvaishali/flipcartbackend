 
 

// multiple file select code

import express from "express";
import multer from "multer";
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import { user } from "../../Mongodb/Flipkartconnect.js";


const Postdata = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Allow multiple files at once (max 10 files here)
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

                const embeddedPage = await pdfDocBarcode.embedPage(page);
                const barcodePage = pdfDocBarcode.addPage([width, height / 1.84]);
                barcodePage.drawPage(embeddedPage, {
                    x: 0,
                    y: -(height / 1.84),
                    width: width,
                    height: height
                });

                const embeddedPage2 = await pdfDocInvoice.embedPage(page);
                const invoicePage = pdfDocInvoice.addPage([width, height / 1.84]);
                invoicePage.drawPage(embeddedPage2, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });
            }

            const timestamp = Date.now();
            const barcodePath = `uploads/barcode-${timestamp}-${file.originalname}`;
            const invoicePath = `uploads/invoice-${timestamp}-${file.originalname}`;

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            fs.writeFileSync(barcodePath, barcodeBytes);
            fs.writeFileSync(invoicePath, invoiceBytes);

            const saved = await user.create({ part1: barcodePath, part2: invoicePath });
            savedFiles.push(saved);
        }

        res.json({ message: "All files uploaded & cropped successfully", data: savedFiles });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing files");
    }
});

export default Postdata;

 
 
 
 
 
 
 
 
 
 
 
 
 
 // single file select code
 
 // import express from "express";
// import multer from "multer";
// import fs from "fs";
// import { PDFDocument } from "pdf-lib";
// import { user } from "../Mongodb/Mongoconnect.js";

// const Postdata = express.Router();

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "uploads/");
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + "-" + file.originalname);
//     }
// });

// const upload = multer({ storage });

// Postdata.post("/", upload.single("file"), async (req, res) => {
//     try {
//         const filePath = req.file.path;
//         const existingPdfBytes = fs.readFileSync(filePath);
//         const pdfDoc = await PDFDocument.load(existingPdfBytes);
//         const totalPages = pdfDoc.getPageCount();

//         const pdfDocBarcode = await PDFDocument.create();
//         const pdfDocInvoice = await PDFDocument.create();

//         for (let i = 0; i < totalPages; i++) {
//             const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
//             const { width, height } = page.getSize();

//             // Embed page first!
//             const embeddedPage = await pdfDocBarcode.embedPage(page);

//             // Barcode Part (Top Half)
//             const barcodePage = pdfDocBarcode.addPage([width, height / 1.84]);
//             barcodePage.drawPage(embeddedPage, {
//                 x: 0,
//                 y: -(height / 1.84),
//                 width: width,
//                 height: height
//             });

//             // Embed again for second PDF
//             const embeddedPage2 = await pdfDocInvoice.embedPage(page);

//             // Invoice Part (Bottom Half)
//             const invoicePage = pdfDocInvoice.addPage([width, height / 1.84]);
//             invoicePage.drawPage(embeddedPage2, {
//                 x: 0,
//                 y: 0,
//                 width: width,
//                 height: height
//             });
//         }

//         // Save files
//         const barcodePath = `uploads/barcode-${Date.now()}.pdf`;
//         const invoicePath = `uploads/invoice-${Date.now()}.pdf`;

//         const barcodeBytes = await pdfDocBarcode.save();
//         const invoiceBytes = await pdfDocInvoice.save();

//         fs.writeFileSync(barcodePath, barcodeBytes);
//         fs.writeFileSync(invoicePath, invoiceBytes);

//         const saved = await user.create({ part1: barcodePath, part2: invoicePath });

//         res.json({ message: "File uploaded & cropped successfully", data: saved });

//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Error processing file");
//     }
// });

// export default Postdata;
