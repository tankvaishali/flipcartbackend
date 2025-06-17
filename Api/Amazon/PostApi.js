import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { amazon } from "../../Mongodb/AmazonConnection.js";

const Postdata = express.Router();

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

let labelCounter = 1; // this will keep increasing for naming folders

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

            // Folder on Desktop
            const desktopPath = path.join("C:/Users/HP/OneDrive/Desktop/AmazonLables");
            if (!fs.existsSync(desktopPath)) {
                fs.mkdirSync(desktopPath, { recursive: true });
            }

            const folderName = `amazon-Lable_${labelCounter++}`;
            const finalFolderPath = path.join(desktopPath, folderName);
            fs.mkdirSync(finalFolderPath, { recursive: true });

            const part1Path = path.join(finalFolderPath, "part1.pdf");
            const part2Path = path.join(finalFolderPath, "part2.pdf");

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

        res.json({ message: "Files split and saved to Desktop with label folders", data: savedFiles });

    } catch (err) {
        console.error("❌ Error while processing PDFs:", err);
        res.status(500).send("Error processing PDF files");
    }
});

export default Postdata;
