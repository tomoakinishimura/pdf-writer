# pdf-writer

指定フォルダを再起的にPDFファイルの書き換えを行います
Windowsコマンドプロンプトにてダウンロードした指定execファイルを実行してください
```shell
C> ./pdw-writer.exe --input フォルダ --output フォルダ
```
他下記方法のオプションが利用できます

```shell
Usage: ./pdf-writer [options]

Options:
--input <inputFolderPath>    Specify the input folder path.
--output <outputFolderPath>  Specify the output folder path.
--size <fontSize>            Specify the font size. (default: 12)
--color <R,G,B>              Specify the text color in RGB format. (default: 0,0,0)
--x <xCoordinate>            Specify the x-coordinate. (default: 5)
--y <yCoordinate>            Specify the y-coordinate. (default: 5)
--help                       Display this help message.
```

## 開発向け

```shell
# for mac
deno compile --unstable --allow-read --allow-write --no-check  pdf-writer.ts

# for windows
deno compile --unstable --allow-read --allow-write --no-check --target x86_64-pc-windows-msvc  pdf-writer.ts
```