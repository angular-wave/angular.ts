import { angular } from "/angular/angular-ts.esm.js";
import { nativeModule } from "/angular/runtime/native.js";
import { routeFromLocation, tabDestination } from "/model.mjs";

nativeModule(angular);

class PulseController {
  static $inject = ["$http", "$native", "$scope"];

  constructor(http, native, scope) {
    this.http = http;
    this.native = native;
    this.location = window.angularNativeEnvironment?.location || window.location.href;
    this.origin = new URL(this.location).origin;
    this.route = routeFromLocation(this.location);
    this.posts = [];
    this.feedPosts = [];
    this.cursor = null;
    this.loading = true;
    this.online = true;
    this.post = null;
    this.profile = null;
    this.profilePosts = [];
    this.activity = [];
    this.draft = { caption: "", error: "", file: null, progress: 0, uploadId: null, uploading: false };
    this.login = { email: "maya@pulse.local", password: "pulse", errors: {}, pending: false };
    this.sheet = { title: "Comments", message: "" };
    this.snackbar = { message: "", actionText: "Dismiss" };
    this.compactNumber = new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    });

    const stopConnectivity = native.on("connectivity", "change", (event) => {
      this.online = Boolean(event.data?.connected);
    });
    const stopUploadProgress = native.on("files", "progress", (event) => {
      const { sent, total, uploadId } = event.data || {};
      if (this.draft.uploading && uploadId === this.draft.uploadId && total > 0) {
        this.draft.progress = Math.min(99, Math.round((sent / total) * 100));
      }
    });
    if (native.supports("connectivity", "watch")) {
      void native.call("connectivity", "watch").catch(() => undefined);
    }

    this.events = new EventSource("/api/events");
    this.events.addEventListener("activity", (event) => {
      this.activity = [JSON.parse(event.data), ...this.activity];
    });
    scope.on("$destroy", () => {
      stopConnectivity();
      stopUploadProgress();
      this.events.close();
    });

  }

  onInit() {
    void this.load();
  }

  get selectedTab() {
    return `tab:${this.route.kind === "post" ? "feed" : this.route.kind}`;
  }

  get showsBack() {
    return this.route.kind === "post";
  }

  get title() {
    if (this.route.kind === "post") return "Post";
    if (this.route.kind === "profile") return "Profile";
    if (this.route.kind === "create") return "Share a moment";
    if (this.route.kind === "explore") return "Explore";
    if (this.route.kind === "activity") return "Activity";
    if (this.route.kind === "login") return "Sign in";
    return "Pulse";
  }

  get contentLabel() {
    if (this.route.kind === "post") return `${this.post?.title || "Loading"} post`;
    if (this.route.kind === "profile") return `${this.profile?.name || "Loading"} profile`;
    return "Pulse feed";
  }

  get detailedPost() {
    return this.route.kind === "post";
  }

  formatCount(value) {
    return this.compactNumber.format(value);
  }

  get profileRows() {
    const rows = [];
    for (let index = 0; index < this.profilePosts.length; index += 3) {
      rows.push(this.profilePosts.slice(index, index + 3));
    }
    return rows;
  }

  get columns() {
    return window.innerWidth >= 720 ? 4 : 3;
  }

  async load() {
    try {
      if (this.route.kind === "feed" || this.route.kind === "explore") {
        const response = await this.http.get("/api/feed");
        this.posts = response.data.items;
        this.feedPosts = this.posts;
        this.cursor = response.data.nextCursor;
      } else if (this.route.kind === "post") {
        this.post = (await this.http.get(`/api/posts/${encodeURIComponent(this.route.id)}`)).data;
        this.posts = [this.post];
      } else if (this.route.kind === "profile") {
        this.profile = (await this.http.get(`/api/profiles/${encodeURIComponent(this.route.handle)}`)).data;
        this.profilePosts = this.profile.posts;
        this.posts = [];
      } else if (this.route.kind === "activity") {
        this.activity = (await this.http.get("/api/activity")).data.items;
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.loading = false;
    }
  }

  async loadMore() {
    if (!this.cursor) return;
    const cursor = this.cursor;
    this.cursor = null;
    try {
      const response = await this.http.get("/api/feed", { params: { cursor } });
      this.posts = [...this.posts, ...response.data.items];
      this.feedPosts = this.posts;
      this.cursor = response.data.nextCursor;
    } catch (error) {
      this.showError(error.message);
    }
  }

  async selectTab(key) {
    const destination = tabDestination(key);
    if (!destination) return;
    const [path, method, transition] = destination;
    if (method === "modal") {
      await this.navigate(path, method, transition);
      return;
    }
    await this.switchTab(path);
  }

  async switchTab(path) {
    const nextLocation = new URL(path, this.origin);
    window.history.replaceState(null, "", nextLocation);
    this.location = nextLocation.href;
    this.route = routeFromLocation(this.location);
    this.loading = true;
    this.cursor = null;
    this.post = null;
    this.profile = null;
    this.profilePosts = [];

    const keepsFeed =
      (this.route.kind === "feed" || this.route.kind === "explore") &&
      this.feedPosts.length > 0;
    if (keepsFeed) {
      this.posts = this.feedPosts;
      this.loading = false;
      return;
    }

    this.posts = [];
    await this.load();
  }

  async navigate(path, method = "push", transition = "fade") {
    if (this.native.available) await this.native.call("navigation", method, { url: path, transition });
    else window.location.assign(path);
  }

  openPost(id) {
    return this.navigate(`/posts/${id}`, "push", "dive");
  }

  openProfile(handle) {
    return this.navigate(`/profiles/${handle}`, "push", "flip");
  }

  back() {
    return this.native.call("navigation", "pop");
  }

  async toggleLike(post) {
    const previous = { liked: post.liked, likes: post.likes };
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    try {
      const response = await this.http.post(`/api/posts/${encodeURIComponent(post.id)}/like`, {});
      post.liked = response.data.liked;
      post.likes = response.data.likes;
    } catch (error) {
      Object.assign(post, previous);
      this.showError(error.message);
    }
  }

  showComments(post) {
    this.sheet = {
      title: `Comments on ${post.title}`,
      message: post.comments.map((comment) => `${comment.author}: ${comment.text}`).join("\n\n") || "No comments yet.",
    };
    requestAnimationFrame(() => void this.native.call("component", "invoke", { id: "pulse-comments", method: "show", args: {} }));
  }

  share(post) {
    return this.native.call("sharing", "share", {
      text: `${post.title} ${this.origin}/posts/${post.id}`,
      title: "Share from Pulse",
    });
  }

  async publish() {
    if (!this.draft.file || this.draft.uploading) return;
    const uploadId = globalThis.crypto?.randomUUID?.() || `pulse-${Date.now()}`;
    this.draft.uploadId = uploadId;
    this.draft.uploading = true;
    this.draft.progress = 0;
    this.draft.error = "";
    try {
      const result = await this.native.call("files", "upload", {
        uri: this.draft.file.uri,
        url: `${this.origin}/api/uploads`,
        name: this.draft.file.name || "pulse-photo.jpg",
        type: this.draft.file.type || "image/jpeg",
        uploadId,
        fields: { caption: this.draft.caption || "A new moment" },
      });
      this.draft.progress = 100;
      await this.navigate(`/posts/${result.body.id}`, "replace", "dive");
    } catch (error) {
      this.draft.error = error.message;
    } finally {
      this.draft.uploading = false;
      this.draft.uploadId = null;
    }
  }

  async signIn() {
    this.login.pending = true;
    this.login.errors = {};
    try {
      await this.http.post("/api/login", {
        email: this.login.email,
        password: this.login.password,
      });
      await this.navigate("/feed", "replace", "fade");
    } catch (error) {
      this.login.errors = error.data?.errors || { password: error.message };
    } finally {
      this.login.pending = false;
    }
  }

  showError(message) {
    this.snackbar = { message, actionText: "Dismiss" };
    requestAnimationFrame(() => void this.native.call("component", "invoke", { id: "pulse-snackbar", method: "show", args: {} }));
  }
}

angular.createModule("pulse", ["ng.native"]).controller("PulseController", PulseController);
angular.bootstrap(document, ["pulse"]);
