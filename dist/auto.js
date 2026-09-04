import { angular } from './index.js';
export { AngularRuntime } from './angular-runtime.js';
export { a, abbr, acronym, address, applet, area, article, aside, attrs, audio, b, base, basefont, bdi, bdo, bgsound, big, blink, blockquote, body, br, button, canvas, caption, center, cite, code, col, colgroup, data, datalist, dd, del, details, dfn, dialog, dir, div, dl, dt, each, em, embed, event, fieldset, figcaption, figure, font, footer, form, frame, frameset, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html, i, iframe, img, input, ins, isindex, kbd, keygen, label, legend, li, link, listing, main, map, mark, marquee, menu, menuitem, meta, meter, multicol, nav, nextid, nobr, noembed, noframes, noscript, object, ol, optgroup, option, output, p, param, picture, plaintext, pre, progress, props, q, rb, rp, rt, rtc, ruby, s, samp, script, search, section, select, slot, small, source, spacer, span, strike, strong, style, sub, summary, sup, table, tag, tagNS, tags, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, tt, u, ul, varTag, video, wbr, xmp } from './core/compile/programmatic-view.js';
export { afterRender, queueAfterRender } from './core/render/after-render.js';
export { createAngular } from './runtime/index.js';
export { defineWorkflow } from './services/workflow/workflow.js';

document.addEventListener("DOMContentLoaded", () => {
    angular.init(document);
}, {
    once: true,
});

export { angular };
