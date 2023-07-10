const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const inputFolderPath = './data'; // フォルダのパスを指定
const outputFolderPath = './output'; // 出力先フォルダのパスを指定

// フォルダ内のファイルを再帰的に処理する関数
async function processFilesInFolder(folderPath) {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const fileStats = fs.statSync(filePath);

        if (fileStats.isDirectory()) {
            // サブフォルダが見つかった場合、再帰的に処理
            await processFilesInFolder(filePath);
        } else if (file.endsWith('.pdf')) {
            // PDFファイルの場合、編集処理を行う
            const outputFilePath = path.join(outputFolderPath, file);

            const pdfBytes = fs.readFileSync(filePath);

            // PDFDocumentオブジェクトを作成
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)

            const pageCount = pdfDoc.getPageCount();
            for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                const page = pdfDoc.getPage(pageIndex);
                // ページの幅と高さを取得
                const pageWidth = page.getWidth();
                const pageHeight = page.getHeight();

                const fontSize = 12;
                const fileName = file.split('_')[0]; // ファイル名から最初の数字を取得
                const textWidth = font.widthOfTextAtSize(fileName, fontSize)
                const textHeigth = font.heightAtSize(fontSize);

                // テキストの基準点を右上隅として指定
                page.drawText(fileName, {
                    x: pageWidth - textWidth - 5, // x座標: 左からの距離
                    y: pageHeight - textHeigth - 5, // y座標: 上からの距離
                    size: fontSize, // テキストのサイズ
                    font: font,
                    color: rgb(0, 0, 0), // テキストの色 (黒色)
                });
            }

            // 編集したPDFを保存
            const modifiedPdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputFilePath, modifiedPdfBytes);
        }
    }
}

// 出力先フォルダを作成
fs.mkdirSync(outputFolderPath, { recursive: true });

// フォルダ内のファイルを処理
processFilesInFolder(inputFolderPath).catch((error) => {
    console.error('エラー:', error);
});
