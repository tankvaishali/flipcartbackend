// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import { PDFDocument } from "pdf-lib";
// import { user } from "../../Mongodb/Meeshoconnect.js";
// import cloudinary from "../cloudinary.js";
// import { log } from "console";

// const Postmeesho = express.Router();

// const storage = multer.diskStorage({});
// const upload = multer({ storage });

// let labelCounter = 1;

// const uploadToCloudinary = async (filePath, fileName) => {
//     return await cloudinary.uploader.upload(filePath, {
//         resource_type: "raw",
//         public_id: `meesho/${fileName}.pdf`,
//         use_filename: true,
//         unique_filename: false,
//         overwrite: true,
//     });
// };

// Postmeesho.post("/", upload.array("files", 10), async (req, res) => {
//     try {
//         let savedFiles = [];

//         for (const file of req.files) {
//             const filePath = file.path;
//             const existingPdfBytes = fs.readFileSync(filePath);
//             const pdfDoc = await PDFDocument.load(existingPdfBytes);
//             const totalPages = pdfDoc.getPageCount();

//             const pdfDocBarcode = await PDFDocument.create();
//             const pdfDocInvoice = await PDFDocument.create();

//             for (let i = 0; i < totalPages; i++) {
//                 const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
//                 const { width, height } = page.getSize();

//                 const embeddedPage = await pdfDocBarcode.embedPage(page);
//                 const barcodePage = pdfDocBarcode.addPage([width, height / 1.84]);
//                 barcodePage.drawPage(embeddedPage, {
//                     x: 0,
//                     y: -(height / 1.84),
//                     width: width,
//                     height: height,
//                 });

//                 const embeddedPage2 = await pdfDocInvoice.embedPage(page);
//                 const invoicePage = pdfDocInvoice.addPage([width, height / 1.84]);
//                 invoicePage.drawPage(embeddedPage2, {
//                     x: 0,
//                     y: 0,
//                     width: width,
//                     height: height,
//                 });
//             }

//             const folderName = `flipkart-Lable_${labelCounter++}`;
//             const finalFolderPath = path.join("C:/Users/HP/OneDrive/Desktop/FlipkartLables", folderName);
//             fs.mkdirSync(finalFolderPath, { recursive: true });

//             const barcodePath = path.join(finalFolderPath, "part1.pdf");
//             const invoicePath = path.join(finalFolderPath, "part2.pdf");

//             const barcodeBytes = await pdfDocBarcode.save();
//             const invoiceBytes = await pdfDocInvoice.save();

//             fs.writeFileSync(barcodePath, barcodeBytes);
//             fs.writeFileSync(invoicePath, invoiceBytes);

//             // 🔹 Upload to Cloudinary
//             const barcodeResult = await uploadToCloudinary(barcodePath, `part1_${Date.now()}`);
//             const invoiceResult = await uploadToCloudinary(invoicePath, `part2_${Date.now()}`);

//             // 🔹 Save URLs in MongoDB
//             const saved = await user.create({
//                 part1: barcodeResult.secure_url,
//                 part2: invoiceResult.secure_url,
//             });
// console.log(saved)
//             savedFiles.push(saved);

//             // Optionally remove temp files
//             fs.unlinkSync(barcodePath);
//             fs.unlinkSync(invoicePath);
//         }

//         res.json({ message: "Files cropped, uploaded to Cloudinary, and saved in DB", data: savedFiles });
//     } catch (err) {
//         console.error("❌ Error processing PDFs:", err);
//         res.status(500).send("Error processing files");
//     }
// });

// export default Postmeesho;
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { user } from "../../Mongodb/Meeshoconnect.js";
import cloudinary from "../cloudinary.js";

const Postmeesho = express.Router();

const storage = multer.diskStorage({});
const upload = multer({ storage });

let labelCounter = 1;

const uploadToCloudinary = async (filePath, fileName) => {
    return await cloudinary.uploader.upload(filePath, {
        resource_type: "raw",
        public_id: `meesho/${fileName}.pdf`,
        use_filename: true,
        unique_filename: false,
        overwrite: true,
    });
};

Postmeesho.post("/", upload.array("files", 10), async (req, res) => {
    try {
        let savedFiles = [];

        for (const file of req.files) {
            const filePath = file.path;
            const existingPdfBytes = fs.readFileSync(filePath);
            const originalPdf = await PDFDocument.load(existingPdfBytes);
            const totalPages = originalPdf.getPageCount();

            const barcodePdf = await PDFDocument.create();
            const invoicePdf = await PDFDocument.create();

            for (let i = 0; i < totalPages; i++) {
                const [page] = await originalPdf.copyPages(originalPdf, [i]);
                const { width, height } = page.getSize();

                // ✅ Barcode (top half)
                const barcodePage = barcodePdf.addPage([width, height / 2]);
                barcodePage.drawPage(page, {
                    x: 0,
                    y: -height / 2,
                    width,
                    height,
                });

                // ✅ Invoice (bottom half)
                const invoicePage = invoicePdf.addPage([width, height / 2]);
                invoicePage.drawPage(page, {
                    x: 0,
                    y: 0,
                    width,
                    height,
                });
            }

            // ✅ Save locally
            const folderName = `flipkart-Label_${labelCounter++}`;
            const folderPath = path.join("C:/Users/HP/OneDrive/Desktop/FlipkartLables", folderName);
            fs.mkdirSync(folderPath, { recursive: true });

            const barcodePath = path.join(folderPath, "part1.pdf");
            const invoicePath = path.join(folderPath, "part2.pdf");

            fs.writeFileSync(barcodePath, await barcodePdf.save());
            fs.writeFileSync(invoicePath, await invoicePdf.save());

            // ✅ Upload to Cloudinary
            const barcodeResult = await uploadToCloudinary(barcodePath, `part1_${Date.now()}`);
            const invoiceResult = await uploadToCloudinary(invoicePath, `part2_${Date.now()}`);

            // ✅ Save in MongoDB
            const saved = await user.create({
                part1: barcodeResult.secure_url,
                part2: invoiceResult.secure_url,
            });

            console.log(saved);
            savedFiles.push(saved);

            // ✅ Clean up local files
            fs.unlinkSync(barcodePath);
            fs.unlinkSync(invoicePath);
            fs.unlinkSync(filePath); // Delete uploaded original
        }

        res.json({
            message: "Files cropped, uploaded to Cloudinary, and saved in DB",
            data: savedFiles,
        });
    } catch (err) {
        console.error("❌ Error processing PDFs:", err);
        res.status(500).send("Error processing files");
    }
});

export default Postmeesho;
