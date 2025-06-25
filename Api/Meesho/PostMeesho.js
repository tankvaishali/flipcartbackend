const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");
const { user } = require("../../Mongodb/Meeshoconnect");

const Postmeesho = express.Router();

// Multer setup: store in temp
const storage = multer.diskStorage({});
const upload = multer({ storage });

// ✅ Get Desktop path (OneDrive or fallback)
function getDesktopPath() {
    const home = os.homedir();
    const oneDriveDesktop = path.join(home, "OneDrive", "Desktop");
    const normalDesktop = path.join(home, "Desktop");

    if (fs.existsSync(oneDriveDesktop)) return oneDriveDesktop;
    if (fs.existsSync(normalDesktop)) return normalDesktop;

    throw new Error("❌ Desktop path not found.");
}

Postmeesho.post("/", upload.array("files", 10), async (req, res) => {
    try {
        const savedFiles = [];

        // Create MeeshoLabels folder on Desktop if it doesn't exist
        const desktopBase = getDesktopPath();
        const outputFolder = path.join(desktopBase, "MeeshoLabels");

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

            for (let i = 0; i < totalPages; i++) {
                const [page] = await pdfDoc.copyPages(pdfDoc, [i]);
                const { width, height } = page.getSize();

                // === PART 1: Barcode section (bottom cropped + top cropped) ===
                const cropTop = 30; // Pixels to remove from top
                const originalCropHeight = height / 2.14;
                const visibleHeight = originalCropHeight - cropTop;

                const barcodePage = pdfDocBarcode.addPage([width, visibleHeight]);
                const embeddedPage = await pdfDocBarcode.embedPage(page);

                barcodePage.drawPage(embeddedPage, {
                    x: 0,
                    y: -cropTop - (height - originalCropHeight),
                    width,
                    height,
                });

                // === PART 2: Invoice section (top cropped as per original logic) ===
                const invoiceHeight = height / 1.76;
                const invoicePage = pdfDocInvoice.addPage([width, invoiceHeight]);
                const embeddedPage2 = await pdfDocInvoice.embedPage(page);

                invoicePage.drawPage(embeddedPage2, {
                    x: 0,
                    y: 0,
                    width,
                    height,
                });
            }

            const baseName = path.basename(file.originalname, path.extname(file.originalname));
            const part1Path = path.join(outputFolder, `${baseName}-part1.pdf`);
            const part2Path = path.join(outputFolder, `${baseName}-part2.pdf`);

            const barcodeBytes = await pdfDocBarcode.save();
            const invoiceBytes = await pdfDocInvoice.save();

            fs.writeFileSync(part1Path, barcodeBytes);
            fs.writeFileSync(part2Path, invoiceBytes);

            const saved = await user.create({ part1: part1Path, part2: part2Path });
            savedFiles.push(saved);
        }

        // ✅ Open MeeshoLabels folder in Explorer
        exec(`start "" "${outputFolder}"`);

        res.json({
            message: "✅ All Meesho files cropped & saved to Desktop > MeeshoLabels",
            folder: outputFolder,
            data: savedFiles,
        });

    } catch (err) {
        console.error("❌ Error processing files:", err);
        res.status(500).send("Error processing PDF files");
    }
});

module.exports = Postmeesho;
