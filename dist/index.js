import { Angular } from './angular.js';
import { scheduleAutoBootstrap } from './auto-bootstrap.js';
export { createAngular } from './runtime/index.js';
export { afterRender, queueAfterRender } from './core/render/after-render.js';
export { a, abbr, address, area, article, aside, attrs, audio, b, base, bdi, bdo, blockquote, body, br, button, canvas, caption, cite, code, col, colgroup, data, datalist, dd, del, details, dfn, dialog, div, dl, dt, each, em, embed, event, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html, i, iframe, img, input, ins, kbd, label, legend, li, link, main, map, mark, menu, meta, meter, nav, noscript, object, ol, optgroup, option, output, p, picture, pre, progress, props, q, rp, rt, ruby, s, samp, script, search, section, select, slot, small, source, span, strong, style, sub, summary, sup, table, tag, tagNS, tags, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, u, ul, varTag, video, wbr } from './core/compile/programmatic-view.js';
export { defineWorkflow } from './services/workflow/workflow.js';
export { nativeCapabilities } from './runtime/native-capabilities.js';
export { AngularRuntime } from './angular-runtime.js';

/**
 * Default browser entry point.
 */
const angular = new Angular();
scheduleAutoBootstrap(angular, document, window);

export { angular };
