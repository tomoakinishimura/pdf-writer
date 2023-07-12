import { ensureDir } from 'https://deno.land/std/fs/mod.ts';
import { join, extname } from 'https://deno.land/std/path/mod.ts';
import { PDFDocument, rgb } from 'https://cdn.pika.dev/pdf-lib@^1.7.0';
import fontkit from '@pdf-lib/fontkit';
import { parse } from 'https://deno.land/std/flags/mod.ts';

const parsedArgs = parse(Deno.args);
const inputFolderPath = parsedArgs.input;
const outputFolderPath = parsedArgs.output;
const isBold = parsedArgs.isBold;
const fontSize = parsedArgs.size ?? 12;
const colorRGB = parsedArgs.color ? parsedArgs.color.split(',').map(Number).map(val => val / 255) : [0, 0, 0];
const x = parsedArgs.x ?? 5;
const y = parsedArgs.y ?? 5;

if (parsedArgs.help) {
    console.log(`Usage: ./pdf-writer [options]

Options:
  --input <inputFolderPath>    Specify the input folder path.
  --output <outputFolderPath>  Specify the output folder path.
  --size <fontSize>            Specify the font size. (default: 12)
  --isBold <boolean>           Specify the true to be bold. (default: false)
  --color <R,G,B>              Specify the text color in RGB format. (default: 0,0,0)
  --x <xCoordinate>            Specify the x-coordinate. (default: 5)
  --y <yCoordinate>            Specify the y-coordinate. (default: 5)
  --help                       Display this help message.
`);
    Deno.exit(0);
}

if (!inputFolderPath || !outputFolderPath) {
    console.error('Error: Input folder path and output folder path must be specified. Use --help for more information.');
    Deno.exit(1);
}

// フォルダ内のファイルを再帰的に処理する関数
async function processFilesInFolder(inputFolderPath: string, outputFolderPath: string) {
    const files = await Deno.readDir(inputFolderPath);

    for await (const file of files) {
        const filePath = join(inputFolderPath, file.name);
        const fileStats = await Deno.stat(filePath);

        if (fileStats.isDirectory) {
            // サブフォルダが見つかった場合、再帰的に処理
            await processFilesInFolder(filePath, outputFolderPath);
        } else if (file.name.endsWith('.pdf')) {
            // PDFファイルの場合、編集処理を行う
            const outputFilePath = join(outputFolderPath, file.name);

            const pdfBytes = await Deno.readFile(filePath);

            // PDFDocumentオブジェクトを作成
            const pdfDoc = await PDFDocument.load(pdfBytes);
            pdfDoc.registerFontkit(fontkit)
            const fontBytes = await Deno.readFile('./Meiryo-01.ttf');
            const fontBoldBytes = await Deno.readFile('./Meiryo-Bold-01.ttf');
            const font = isBold ? await pdfDoc.embedFont(fontBoldBytes, { subset: true }) :
                await pdfDoc.embedFont(fontBytes, { subset: true });

            const pageCount = pdfDoc.getPageCount();
            for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                const page = pdfDoc.getPage(pageIndex);
                // ページの幅と高さを取得
                const { width: pageWidth, height: pageHeight } = page.getSize();

                const fileName = file.name.split('_')[0].replace('№', '伝票番号'); // ファイル名から最初の数字を取得
                const textWidth = font.widthOfTextAtSize(fileName, fontSize);
                const textHeight = font.heightAtSize(fontSize);

                // テキストの基準点を右上隅として指定
                page.drawText(fileName, {
                    x: pageWidth - textWidth - x, // x座標: 左からの距離
                    y: pageHeight - textHeight - y, // y座標: 上からの距離
                    size: fontSize, // テキストのサイズ
                    font,
                    color: rgb(colorRGB[0], colorRGB[1], colorRGB[2]), // テキストの色 (RGBフォーマット)
                });
            }

            // 編集したPDFを保存
            const modifiedPdfBytes = await pdfDoc.save();
            await Deno.writeFile(outputFilePath, modifiedPdfBytes);
        }
    }
}

// 出力先フォルダを作成
await ensureDir(outputFolderPath);

// フォルダ内のファイルを処理
await processFilesInFolder(inputFolderPath, outputFolderPath).catch((error) => {
    console.error('Error:', error);
});
