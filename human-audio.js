(function () {
  "use strict";
  class HumanAudio {
    constructor(element, status) {
      this.el = element;
      this.status = status;
      this.token = 0;
      this.pending = null;
      this.enabled = true;
      this.timer = null;
    }
    entry(kind, text) {
      if (kind === "letter")
        return text === "Ь"
          ? null
          : { file: "audio/" + text.codePointAt(0).toString(16) + ".mp3" };
      return (
        window.SpeechLibrary?.[kind === "word" ? "words" : "syllables"]?.[
          text
        ] || null
      );
    }
    stop() {
      this.token++;
      clearTimeout(this.timer);
      this.el.pause();
      this.el.removeAttribute("src");
      this.el.load();
      if (this.pending) {
        this.pending(false);
        this.pending = null;
      }
      this.status("");
    }
    play(kind, text) {
      this.stop();
      const entry = this.entry(kind, text);
      if (!entry || !this.enabled) {
        this.status(!entry ? "Для цього звуку немає запису" : "Звук вимкнено");
        return Promise.resolve(false);
      }
      const token = this.token;
      this.el.src = entry.file;
      this.status("Слухаємо…");
      return new Promise((resolve) => {
        this.pending = resolve;
        const finish = (ok) => {
          if (token !== this.token) return;
          clearTimeout(this.timer);
          this.pending = null;
          this.status(
            ok ? "Слухай ще раз або обирай" : "Не вдалося відтворити запис",
          );
          resolve(ok);
        };
        this.el.onended = () => finish(true);
        this.el.onerror = () => finish(false);
        this.timer = setTimeout(() => finish(false), 12000);
        this.el.play().catch(() => finish(false));
      });
    }
  }
  window.HumanAudio = HumanAudio;
})();
