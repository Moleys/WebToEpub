"use strict";

parserFactory.register("www.akatsuki-novels.com", () => new NovelDownloaderAkatsukiNovelsParser());

class NovelDownloaderAkatsukiNovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("table.list td > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        dom.querySelectorAll("center > img").forEach(img => {
            let parent = img.parentElement;
            if (parent != null) {
                parent.replaceWith(img);
            }
        });

        let contentRaw = dom.createElement("div");
        let nodes = Array.from(dom.querySelectorAll(".body-novel, .body-novel + hr"));
        if (nodes.length > 1) {
            let previous = nodes[0].previousElementSibling;
            if (previous != null && previous.nodeName.toLowerCase() === "div") {
                nodes.unshift(previous);
            }
        }
        for (const node of nodes) {
            if (node instanceof HTMLDivElement && node.className === "body-novel") {
                contentRaw.appendChild(convertBr(node, true));
            } else {
                contentRaw.appendChild(node.cloneNode(true));
            }
        }
        return contentRaw;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#LookNovel");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".box.story > h3.font-bb:nth-last-of-type(1) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".box.story.body-normal > .body-normal > div");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.font-bb > center > img");
    }

    extractLanguage() {
        return "ja";
    }
}

function convertBr(node, preserveTrailing) {
    let html = node.innerHTML.replace(/<br\s*\/?>/gi, "\n");
    let lines = html.split(/\n+/);
    let container = node.ownerDocument.createElement("div");
    for (const line of lines) {
        let text = line.trim();
        if (text === "") {
            continue;
        }
        let p = node.ownerDocument.createElement("p");
        p.innerHTML = text;
        container.appendChild(p);
    }
    if (preserveTrailing && container.childNodes.length === 0) {
        let p = node.ownerDocument.createElement("p");
        p.innerHTML = node.innerHTML;
        container.appendChild(p);
    }
    return container;
}
