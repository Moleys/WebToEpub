"use strict";

parserFactory.register("yomou.syosetu.com", () => new IReaderYomouSyosetuParser());

class IReaderYomouSyosetuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let links = [...dom.querySelectorAll("a[href*='ncode.syosetu.com']")]
            .map(a => a.href);
        let unique = [...new Set(links.filter(l => !util.isNullOrEmpty(l)))];
        if (unique.length === 1) {
            let xhr = (await HttpClient.wrapFetch(unique[0]));
            let parser = new SyosetuParser();
            return parser.getChapterUrls(xhr.responseXML, chapterUrlsUI);
        }
        if (unique.length === 0) {
            ErrorLog.showErrorMessage(new Error("No novel link found. Open the novel page on ncode.syosetu.com."));
        } else {
            ErrorLog.showErrorMessage(new Error("Multiple novels found. Open the desired novel on ncode.syosetu.com."));
        }
        return [];
    }

    findContent(dom) {
        return dom.body || dom.documentElement;
    }

    extractTitleImpl(dom) {
        const selector = "title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }
}
