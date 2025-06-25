const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");
const { user } = require("../../Mongodb/Flipkartconnect");

const Postdata = express.Router();

// Multer config
const storage = multer.diskStorage({});
const upload = multer({ storage });

// Get OneDrive or Desktop path
function getOneDriveDesktopPath() {
    const home = os.homedir();
    const oneDriveDesktop = path.join(home, "OneDrive", "Desktop");
    const normalDesktop = path.join(home, "Desktop");

    if (fs.existsSync(oneDriveDesktop)) return oneDriveDesktop;
    if (fs.existsSync(normalDesktop)) return normalDesktop;

    throw new Error("❌ Desktop folder not found.");
}

// 📦 POST Route
Postdata.post("/", upload.array("files", 10), async (req, res) => {
    try {
        let savedFiles = [];

        const desktopPath = getOneDriveDesktopPath();
        const outputFolder = path.join(desktopPath, "FlipkartLabels");

        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        for (const file of req.files) {
            const filePath = file.path;
            const existingPdfBytes = fs.readFileSync(filePath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const totalPages = pdfDoc.getPageCount();

            const pdfDocBarcode = await PDFDocument.create();
            const pdfDocInvoice = await PDFDocument.create();

            // === PART 1: Only First Page - Crop Barcode Area Centered ===
            if (totalPages >= 1) {
                const [firstPage] = await pdfDoc.copyPages(pdfDoc, [0]);
                const { width, height } = firstPage.getSize();

                const cropHeight = 385;      // Vertical crop (height of barcode)
                const cropLeft = 150;        // Horizontal left crop
                const cropRight = 150;       // Horizontal right crop
                const croppedWidth = width - cropLeft - cropRight;

                const barcodePage = pdfDocBarcode.addPage([croppedWidth, cropHeight]);
                const embeddedPage = await pdfDocBarcode.embedPage(firstPage);

                barcodePage.drawPage(embeddedPage, {
                    x: -cropLeft,
                    y: -height + cropHeight, // Crop from bottom
                    width: width,
                    height: height,
                });
            }

            // === PART 2: All Pages - Top Crop for Invoice ===
            for (let i = 0; i < totalPages; i++) {
                const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
                const { width, height } = page.getSize();

                const invoiceHeight = height / 1.84;
                const invoicePage = pdfDocInvoice.addPage([width, invoiceHeight]);

                const embeddedPage2 = await pdfDocInvoice.embedPage(page);

                invoicePage.drawPage(embeddedPage2, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            }

            const baseName = path.basename(file.originalname, path.extname(file.originalname));
            const barcodePath = path.join(outputFolder, `${baseName}-part1.pdf`);
            const invoicePath = path.join(outputFolder, `${baseName}-part2.pdf`);

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            fs.writeFileSync(barcodePath, barcodeBytes);
            fs.writeFileSync(invoicePath, invoiceBytes);

            const saved = await user.create({ part1: barcodePath, part2: invoicePath });
            savedFiles.push(saved);
        }

        // ✅ Open the FlipkartLabels folder
        exec(`start "" "${outputFolder}"`);

        res.json({
            message: "✅ All files processed & saved in FlipkartLabels on Desktop",
            folder: outputFolder,
            data: savedFiles,
        });

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).send("Error processing files");
    }
});

module.exports = Postdata;
