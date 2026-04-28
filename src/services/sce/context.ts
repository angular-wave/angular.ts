export const SCE_CONTEXTS = {
  // HTML is used when there's HTML rendered (e.g. ng-bind-html, iframe srcdoc binding).
  _HTML: "html",

  // An URL used in a context where it refers to the source of media, which are not expected to be run
  // as scripts, such as an image, audio, video, etc.
  _MEDIA_URL: "mediaUrl",

  // An URL used in a context where it does not refer to a resource that loads code.
  // A value that can be trusted as a URL can also trusted as a MEDIA_URL.
  _URL: "url",

  // RESOURCE_URL is a subtype of URL used where the referred-to resource could be interpreted as
  // code. (e.g. ng-include, script src binding, templateUrl)
  // A value that can be trusted as a RESOURCE_URL, can also trusted as a URL and a MEDIA_URL.
  _RESOURCE_URL: "resourceUrl",
} as const;

export type SceContext = (typeof SCE_CONTEXTS)[keyof typeof SCE_CONTEXTS];
