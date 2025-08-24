import { ensureDir } from 'https://deno.land/std/fs/mod.ts';
import { join, extname, dirname, fromFileUrl } from 'https://deno.land/std/path/mod.ts';
import { PDFDocument, rgb } from 'https://cdn.pika.dev/pdf-lib@^1.7.0';
import fontkit from '@pdf-lib/fontkit';
import { parse } from 'https://deno.land/std/flags/mod.ts';

// 実行可能ファイルの場所を取得
const executableDir = dirname(fromFileUrl(import.meta.url));

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

// フォントファイルのパスを設定（複数の候補を試行）
const fontPaths = [
    // 実行可能ファイルと同じディレクトリ
    { regular: join(executableDir, "Meiryo-01.ttf"), bold: join(executableDir, "Meiryo-Bold-01.ttf") },
    // カレントディレクトリ
    { regular: "./Meiryo-01.ttf", bold: "./Meiryo-Bold-01.ttf" },
    // Windowsのシステムフォント（.ttfファイル）
    { regular: "C:\\Windows\\Fonts\\meiryo.ttf", bold: "C:\\Windows\\Fonts\\meiryo.ttf" },
    // Windowsのシステムフォント（.ttcファイル）
    { regular: "C:\\Windows\\Fonts\\meiryo.ttc", bold: "C:\\Windows\\Fonts\\meiryo.ttc" }
];

// フォントファイルを読み込む
let meiryoRegularBuffer: Uint8Array;
let meiryoBoldBuffer: Uint8Array;
let fontsLoaded = false;
let fontSource = "";

for (const fontPath of fontPaths) {
    try {
        meiryoRegularBuffer = await Deno.readFile(fontPath.regular);
        meiryoBoldBuffer = await Deno.readFile(fontPath.bold);
        fontSource = fontPath.regular;
        console.log(`Fonts loaded successfully from: ${fontPath.regular}`);
        fontsLoaded = true;
        break;
    } catch (error) {
        console.log(`Failed to load fonts from: ${fontPath.regular}`);
        continue;
    }
}

if (!fontsLoaded) {
    console.error('Error: Could not load font files. Please ensure Meiryo fonts are available.');
    console.error('Font paths attempted:');
    fontPaths.forEach(path => console.error(`  Regular: ${path.regular}, Bold: ${path.bold}`));
    console.error('');
    console.error('Solutions:');
    console.error('1. Place Meiryo-01.ttf and Meiryo-Bold-01.ttf in the same directory as the executable');
    console.error('2. Install Meiryo fonts on your system');
    console.error('3. Use --help for more information');
    Deno.exit(1);
}

// フォントの種類に応じてサブセット設定を動的に調整
const shouldUseSubset = !fontSource.includes('.ttc') && !fontSource.includes('meiryo.ttc');

// フォルダ内のファイルを再帰的に処理する関数
async function processFilesInFolder(inputPath: string, outputFolderPath: string) {
    const inputStats = await Deno.stat(inputPath);
    
    if (inputStats.isFile) {
        // 単一ファイルの場合
        if (inputPath.endsWith('.pdf')) {
            const fileName = inputPath.split('/').pop() || 'output.pdf';
            const outputFilePath = join(outputFolderPath, fileName);
            await processSinglePdfFile(inputPath, outputFilePath);
        } else {
            console.error('Error: Input file is not a PDF file.');
            Deno.exit(1);
        }
    } else if (inputStats.isDirectory) {
        // フォルダの場合（既存の処理）
        const files = await Deno.readDir(inputPath);

        for await (const file of files) {
            const filePath = join(inputPath, file.name);
            const fileStats = await Deno.stat(filePath);

            if (fileStats.isDirectory) {
                // サブフォルダが見つかった場合、再帰的に処理
                await processFilesInFolder(filePath, outputFolderPath);
            } else if (file.name.endsWith('.pdf')) {
                // PDFファイルの場合、編集処理を行う
                const outputFilePath = join(outputFolderPath, file.name);
                await processSinglePdfFile(filePath, outputFilePath);
            }
        }
    } else {
        console.error('Error: Input path is neither a file nor a directory.');
        Deno.exit(1);
    }
}

// 単一のPDFファイルを処理する関数
async function processSinglePdfFile(inputFilePath: string, outputFilePath: string) {
    console.log(`Processing: ${inputFilePath} -> ${outputFilePath}`);
    
    const pdfBytes = await Deno.readFile(inputFilePath);

    // PDFDocumentオブジェクトを作成
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(fontkit)
    
    // フォントの種類に応じてサブセット設定を調整
    const font = isBold ? await pdfDoc.embedFont(meiryoBoldBuffer, { subset: shouldUseSubset }) :
        await pdfDoc.embedFont(meiryoRegularBuffer, { subset: shouldUseSubset });

    const pageCount = pdfDoc.getPageCount();
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const page = pdfDoc.getPage(pageIndex);
        // ページの幅と高さを取得
        const { width: pageWidth, height: pageHeight } = page.getSize();

        const fileName = inputFilePath.split('/').pop()?.split('_')[0]?.replace('№', '伝票番号') || 'ファイル名'; // ファイル名から最初の数字を取得
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
    console.log(`Completed: ${outputFilePath}`);
}

// 出力先フォルダを作成
await ensureDir(outputFolderPath);

// フォルダ内のファイルを処理
await processFilesInFolder(inputFolderPath, outputFolderPath).catch((error) => {
    console.error('Error:', error);
});
