"use strict";

class TextExporter { // eslint-disable-line no-unused-vars

    static chapterToText(chapterTitle, nodes) {
        let tempDiv = document.createElement("div");
        for (let node of nodes) {
            let clone = node.cloneNode(true);
            tempDiv.appendChild(clone);
        }
        // Remove heading elements to avoid duplicating the chapter title
        for (let h of [...tempDiv.querySelectorAll("h1, h2, h3, h4, h5, h6")]) {
            h.remove();
        }
        // Insert newlines at block boundaries so textContent has line breaks
        for (let br of [...tempDiv.querySelectorAll("br")]) {
            br.replaceWith(document.createTextNode("\n"));
        }
        for (let block of [...tempDiv.querySelectorAll("p, div, li, tr, blockquote, pre, hr")]) {
            block.insertBefore(document.createTextNode("\n"), block.firstChild);
            block.appendChild(document.createTextNode("\n"));
        }
        let rawText = tempDiv.textContent || "";
        let lines = rawText.split("\n")
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .map(l => "\t" + l);
        return (chapterTitle || "") + "\n" + lines.join("\n");
    }

    /**
     * Extract text chapter data from epubItems before EPUB packing consumes the nodes.
     * Must be called BEFORE packEpub().
     */
    static extractTextChapters(epubItems) {
        let chapters = [];
        for (let item of epubItems) {
            if (item.nodes && item.chapterTitle !== undefined) {
                chapters.push({
                    title: item.chapterTitle || "",
                    text: TextExporter.chapterToText(item.chapterTitle, item.nodes)
                });
            }
        }
        return chapters;
    }

    static exportAsTxt(textChapters, baseFileName) {
        let parts = textChapters.map(ch => ch.text);
        let text = parts.join("\n////\n");
        let blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        return { blob: blob, fileName: baseFileName + ".txt" };
    }

    static async exportAsTxtZip(textChapters, baseFileName) {
        let zipFileWriter = new zip.BlobWriter("application/zip");
        let zipWriter = new zip.ZipWriter(zipFileWriter, {
            useWebWorkers: false,
            compressionMethod: 8,
            extendedTimestamp: false
        });
        for (let i = 0; i < textChapters.length; i++) {
            let index = String(i + 1).padStart(3, "0");
            await zipWriter.add(index + ".txt", new zip.TextReader(textChapters[i].text));
        }
        let blob = await zipWriter.close();
        return { blob: blob, fileName: baseFileName + ".zip" };
    }
}
