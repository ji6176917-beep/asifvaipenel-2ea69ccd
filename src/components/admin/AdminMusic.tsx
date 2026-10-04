import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music, Upload, Star, Trash2, RotateCcw, Pencil, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { adminListSongs, adminSaveSong, adminSetMusicEnabled, adminSongAction, adminSongUploadUrl } from "@/lib/music.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Form = {
  id?: string; title: string; artist: string; file_path: string; source_url: string; cover_path: string | null;
  active: boolean; sort: number; volume: number; loop: boolean; autoplay: boolean; show_for: "all" | "first";
};
const blank: Form = { title: "", artist: "", file_path: "", source_url: "", cover_path: null, active: true, sort: 0, volume: 70, loop: true, autoplay: true, show_for: "all" };

export function AdminMusic() {
  const list = useServerFn(adminListSongs);
  const save = useServerFn(adminSaveSong);
  const act = useServerFn(adminSongAction);
  const setEnabled = useServerFn(adminSetMusicEnabled);
  const upUrl = useServerFn(adminSongUploadUrl);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-songs"], queryFn: () => list() });
  const [f, setF] = useState<Form | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [busy, setBusy] = useState(false);
  const reload = () => { qc.invalidateQueries({ queryKey: ["admin-songs"] }); qc.invalidateQueries({ queryKey: ["welcome-song"] }); qc.invalidateQueries({ queryKey: ["settings"] }); };

  const upload = async (file: File, kind: "audio" | "cover") => {
    const max = kind === "audio" ? 15 : 2;
    if (file.size > max * 1024 * 1024) { toast.error(`Max ${max} MB`); return; }
    setBusy(true);
    try {
      const { path, token } = await upUrl({ data: { name: file.name, kind } });
      const { error } = await supabase.storage.from("music").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      setF((p) => {
        const b = p ?? blank;
        return kind === "audio"
          ? { ...b, file_path: path, source_url: "", title: b.title || file.name.replace(/\.[^.]+$/, "") }
          : { ...b, cover_path: path };
      });
      toast.success("Uploaded");
    } catch (e) { toast.error((e as Error).message || "Upload failed"); }
    finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f) return;
    const src = mode === "url" ? f.source_url.trim() : "";
    if (mode === "upload" && !f.file_path) { toast.error("Upload an audio file first"); return; }
    if (mode === "url" && !/^https:\/\/\S+$/i.test(src)) { toast.error("Paste a direct https:// audio link"); return; }
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      await save({ data: { ...f, source_url: src || null, file_path: mode === "url" ? "" : f.file_path } });
      toast.success("Song saved"); setF(null); reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const action = async (id: string, a: "welcome" | "unwelcome" | "delete" | "restore" | "on" | "off") => {
    try { await act({ data: { id, action: a } }); toast.success("Updated — visitors get the change right away"); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="The active welcome song plays when visitors enter the site.">Music</PageTitle>
      <Card className="flex items-center justify-between gap-3">
        <div><div className="label-premium">Welcome music enabled</div><div className="text-xs text-muted-foreground">Turns the welcome song on or off for every visitor.</div></div>
        <Switch aria-label="Welcome music enabled" checked={data?.enabled ?? true}
          onCheckedChange={async (v) => { await setEnabled({ data: { enabled: v } }); toast.success(v ? "Music on" : "Music off"); reload(); }} />
      </Card>

      <Card>
        {!f ? (
          <button onClick={() => { setF(blank); setMode("upload"); }} className="btn-glow w-full"><Upload className="h-4 w-4" /> Add a song</button>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode("upload")} className={`rounded-full px-4 py-1.5 text-sm ${mode === "upload" ? "bg-brand text-primary-foreground" : "bg-accent"}`}><Upload className="mr-1 inline h-3.5 w-3.5" /> Upload</button>
              <button type="button" onClick={() => setMode("url")} className={`rounded-full px-4 py-1.5 text-sm ${mode === "url" ? "bg-brand text-primary-foreground" : "bg-accent"}`}><LinkIcon className="mr-1 inline h-3.5 w-3.5" /> Audio URL</button>
            </div>
            {mode === "upload" ? (
              <div>
                <label className={labelCls} htmlFor="song-file">Audio file — mp3, m4a or wav, max 15 MB {f.file_path && <span className="text-success">✓ uploaded</span>}</label>
                <input id="song-file" type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" className={inputCls} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "audio")} />
              </div>
            ) : (
              <div>
                <label className={labelCls} htmlFor="song-url">Direct audio URL</label>
                <input id="song-url" className={inputCls} placeholder="https://example.com/song.mp3" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="song-cover">Thumbnail (optional) {f.cover_path && <span className="text-success">✓</span>}</label>
              <input id="song-cover" type="file" accept="image/png,image/jpeg,image/webp" className={inputCls} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="song-title">Song title</label><input id="song-title" className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="song-artist">Artist</label><input id="song-artist" className={inputCls} value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} /></div>
            </div>
            <div>
              <label className={labelCls} htmlFor="song-vol">Default volume: {f.volume}</label>
              <input id="song-vol" type="range" min={0} max={100} value={f.volume} onChange={(e) => setF({ ...f, volume: Number(e.target.value) })} className="w-full accent-primary" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.loop} onCheckedChange={(v) => setF({ ...f, loop: v })} /> Loop</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.autoplay} onCheckedChange={(v) => setF({ ...f, autoplay: v })} /> Autoplay on entry</label>
              <select aria-label="Show for" className={inputCls} value={f.show_for} onChange={(e) => setF({ ...f, show_for: e.target.value as "all" | "first" })}>
                <option value="all">All visitors</option>
                <option value="first">First visit only</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setF(null)} className="btn-ghost-glow">Cancel</button>
              <button disabled={busy} className="btn-glow">{busy && <Spinner />} Save</button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        {isLoading ? <Skeleton className="h-32 rounded-2xl" /> : !data?.songs.length ? <Empty text="No songs yet." /> : (
          <div className="space-y-2">
            {data.songs.map((s) => (
              <div key={s.id} className={`rounded-2xl border border-border/50 p-3 ${s.deleted_at ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-brand flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-primary-foreground">
                    {s.cover ? <img src={s.cover} alt="" className="h-full w-full object-cover" /> : <Music className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="label-premium truncate">{s.title} {s.is_welcome && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">ACTIVE WELCOME</span>}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.artist || "—"} · vol {s.volume} · {s.loop ? "loop" : "once"} · {s.autoplay ? "autoplay" : "manual"} · {s.show_for === "first" ? "first visit" : "all visitors"}{!s.active && " · OFF"}
                    </div>
                  </div>
                  {s.deleted_at ? (
                    <button onClick={() => action(s.id, "restore")} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => action(s.id, s.is_welcome ? "unwelcome" : "welcome")} className={`${s.is_welcome ? "btn-glow" : "btn-ghost-glow"} !px-3 !py-1.5 text-xs`}><Star className="h-3.5 w-3.5" /> {s.is_welcome ? "Active welcome song" : "Set as active welcome song"}</button>
                      <button onClick={() => { setMode(s.source_url ? "url" : "upload"); setF({ id: s.id, title: s.title, artist: s.artist, file_path: s.file_path, source_url: s.source_url ?? "", cover_path: s.cover_path, active: s.active, sort: s.sort, volume: s.volume, loop: s.loop, autoplay: s.autoplay, show_for: s.show_for === "first" ? "first" : "all" }); }} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      <Switch aria-label={s.active ? "Turn off" : "Turn on"} checked={s.active} onCheckedChange={(v) => action(s.id, v ? "on" : "off")} />
                      <button aria-label="Delete song" onClick={() => confirm("Move this song to trash?") && action(s.id, "delete")} className="btn-ghost-glow !px-3 !py-1.5 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
                {s.url && !s.deleted_at && <audio controls preload="none" src={s.url} className="mt-2 h-9 w-full" />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
