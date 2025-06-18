import express from "express";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import { user } from "../../Mongodb/Meeshoconnect.js";
import streamifier from "streamifier";
import archiver from "archiver";
import cloudinary from "../cloudinary.js";

const Postmeesho = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

Postmeesho.post("/", upload.array("files", 10), async (req, res) => {
    try {
        const zipArchive = archiver("zip", { zlib: { level: 9 } });
        const zipChunks = [];

        // Stream ZIP output in memory
        zipArchive.on("data", chunk => zipChunks.push(chunk));
        zipArchive.on("warning", err => console.warn("ZIP warning:", err));
        zipArchive.on("error", err => { throw err });

        let savedFiles = [];

        for (const file of req.files) {
            const pdfDoc = await PDFDocument.load(file.buffer);
            const totalPages = pdfDoc.getPageCount();

            const pdfDocBarcode = await PDFDocument.create();
            const pdfDocInvoice = await PDFDocument.create();

            for (let i = 0; i < totalPages; i++) {
                const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
                const { width, height } = page.getSize();

                const barcodePage = pdfDocBarcode.addPage([width, height / 1.52]);
                barcodePage.drawPage(page, {
                    x: 0,
                    y: -(height / 1.52),
                    width,
                    height
                });

                const invoicePage = pdfDocInvoice.addPage([width, height / 1.52]);
                invoicePage.drawPage(page, {
                    x: 0,
                    y: 0,
                    width,
                    height
                });
            }

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            // Upload both parts to Cloudinary
            const uploadToCloudinary = (buffer, filename) =>
                new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { resource_type: "raw", public_id: `meesho/${filename}` },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    streamifier.createReadStream(buffer).pipe(uploadStream);
                });

            const part1Url = await uploadToCloudinary(barcodeBytes, `part1_${Date.now()}`);
            const part2Url = await uploadToCloudinary(invoiceBytes, `part2_${Date.now()}`);

            // Add to ZIP in memory
            zipArchive.append(Buffer.from(barcodeBytes), { name: `part1_${Date.now()}.pdf` });
            zipArchive.append(Buffer.from(invoiceBytes), { name: `part2_${Date.now()}.pdf` });

            const saved = await user.create({ part1: part1Url, part2: part2Url });
            savedFiles.push(saved);
        }

        // Finalize the zip
        zipArchive.finalize();

        zipArchive.on("end", () => {
            const zipBuffer = Buffer.concat(zipChunks);
            res.set({
                "Content-Type": "application/zip",
                "Content-Disposition": "attachment; filename=meesho_labels.zip",
                "Content-Length": zipBuffer.length
            });
            res.send(zipBuffer);
        });

    } catch (err) {
        console.error("❌ Error processing files:", err);
        res.status(500).send("Error processing PDF files");
    }
});

export default Postmeesho;
