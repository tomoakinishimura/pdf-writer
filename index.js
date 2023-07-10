const fs = require('fs');
const path = require('path');
const hummus = require('hummus');

const inputFolderPath = './data'; // フォルダのパスを指定
const outputFolderPath = './output'; // 出力先フォルダのパスを指定

// フォルダ内のファイルを再帰的に処理する関数
function processFilesInFolder(folderPath) {
    const files = fs.readdirSync(folderPath);

    files.forEach((file) => {
        const filePath = path.join(folderPath, file);
        const fileStats = fs.statSync(filePath);

        if (fileStats.isDirectory()) {
            // サブフォルダが見つかった場合、再帰的に処理
            processFilesInFolder(filePath);
        } else if (file.endsWith('.pdf')) {
            // PDFファイルの場合、編集処理を行う
            const outputFilePath = path.join(outputFolderPath, file);

            const pdfWriter = hummus.createWriterToModify(filePath, {
                modifiedFilePath: outputFilePath,
            });

            // フォントファイルをインポート
            const font = pdfWriter.getFontForFile("/System/Library/Fonts/NewYork.ttf");

            const pdfParser = pdfWriter.getModifiedFileParser();
            const pageTotalCount = pdfParser.getPagesCount();
            for (let pageIndex = 0; pageIndex < pageTotalCount; pageIndex++) {
                const pageModifier = new hummus.PDFPageModifier(pdfWriter, pageIndex);
                const fileName = file.split('_')[0]; // ファイル名から最初の数字を取得

                // const x = 100; // x座標: 左からの距離
                // const y = 100; // y座標: 上からの距離

                pageModifier.startContext().getContext().writeText(
                    fileName, // 入力文字列
                    500,800,
                    // pageWidth - x, // 右からの距離（右端から左方向に負の値）
                    // pageHeight - y, // 上からの距離（上端から下方向に正の値）
                    {
                        font: font,         // フォントの指定
                        size: 12,           // 文字サイズの指定
                        colorspace: 'gray', // 色空間を"gray", "cmyk", "rgb"から選択
                        color: 0x00         // カラーコード
                    }
                );
                pageModifier.endContext().writePage();
            }

            pdfWriter.end();
        }
    });
}

// 出力先フォルダを作成
fs.mkdirSync(outputFolderPath, { recursive: true });

// フォルダ内のファイルを処理
processFilesInFolder(inputFolderPath);
