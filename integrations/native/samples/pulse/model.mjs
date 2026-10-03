export function tabDestination(key) {
  const destinations = {
    "tab:feed": ["/feed", "replace", "fade"],
    "tab:explore": ["/explore", "replace", "fade"],
    "tab:create": ["/create", "replace", "cover"],
    "tab:activity": ["/activity", "replace", "slide"],
    "tab:profile": ["/profiles/elena", "replace", "flip"],
  };
  return destinations[key];
}

export function routeFromLocation(location) {
  const path = new URL(location).pathname;
  if (path === "/" || path === "/feed") return { kind: "feed" };
  if (path === "/explore") return { kind: "explore" };
  if (path === "/create") return { kind: "create" };
  if (path === "/activity") return { kind: "activity" };
  if (path === "/login") return { kind: "login" };
  if (path.startsWith("/posts/")) return { kind: "post", id: path.split("/")[2] };
  if (path.startsWith("/profiles/")) return { kind: "profile", handle: path.split("/")[2] };
  return { kind: "feed" };
}
