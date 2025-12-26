// src/lib/youtube.ts
export function extractYouTubeVideoId(input: string): string | null {
    const raw = input.trim();
  
    // Jika user memasukkan langsung videoId (umumnya 11 karakter)
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  
    // Coba parsing sebagai URL
    try {
      const url = new URL(raw);
  
      // youtu.be/<id>
      if (url.hostname.includes("youtu.be")) {
        const id = url.pathname.split("/").filter(Boolean)[0];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
  
      // youtube.com/watch?v=<id>
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  
      // youtube.com/embed/<id> atau /shorts/<id>
      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortsIdx + 1])) {
        return parts[shortsIdx + 1];
      }
  
      return null;
    } catch {
      return null;
    }
  }
  