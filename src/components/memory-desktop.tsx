"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  Disc3,
  ImagePlus,
  Mail,
  Music2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  addPictureMemory,
  addSongMemory,
  createEmptyArchive,
  MemoryArchive,
  MEMORY_STORAGE_KEY,
  parseMemoryArchive,
  PictureMemory,
  SongMemory,
} from "@/lib/memories";

const FEATURED_SONGS: SongMemory[] = [
  {
    id: "featured-space-song",
    title: "Space Song",
    artist: "Beach House",
    note: "For late rides when the city turns soft around the edges.",
    link: "https://open.spotify.com/search/Space%20Song%20Beach%20House",
    createdAt: "2026-08-18T00:00:00.000Z",
  },
  {
    id: "featured-plastic-love",
    title: "Plastic Love",
    artist: "Mariya Takeuchi",
    note: "A neon-lit reminder that a little drama can still feel weightless.",
    link: "https://open.spotify.com/search/Plastic%20Love%20Mariya%20Takeuchi",
    createdAt: "2026-06-07T00:00:00.000Z",
  },
  {
    id: "featured-mystery-of-love",
    title: "Mystery of Love",
    artist: "Sufjan Stevens",
    note: "Quiet, close, and kept for mornings that begin slowly.",
    link: "https://open.spotify.com/search/Mystery%20of%20Love%20Sufjan%20Stevens",
    createdAt: "2026-03-21T00:00:00.000Z",
  },
];

const FEATURED_PICTURES: PictureMemory[] = [
  {
    id: "featured-evening",
    caption: "An evening worth keeping",
    note: "Some light makes an ordinary place feel like it was waiting for you.",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=88",
    createdAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "featured-mountains",
    caption: "Out where the noise ends",
    note: "Cool air, no signal, nowhere else to be.",
    imageUrl:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1100&q=88",
    createdAt: "2026-05-02T00:00:00.000Z",
  },
  {
    id: "featured-city",
    caption: "Bangkok, between places",
    note: "The view on the way became the part I remembered.",
    imageUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1100&q=88",
    createdAt: "2026-02-16T00:00:00.000Z",
  },
];

const SONG_ICON_GRADIENTS = [
  "linear-gradient(140deg, #7cb8ff 0%, #5a8dee 55%, #7f6bff 100%)",
  "linear-gradient(140deg, #ff9ec3 0%, #ff6f91 55%, #c86dd7 100%)",
  "linear-gradient(140deg, #9be8d8 0%, #4fc3a1 55%, #3f9fbf 100%)",
];

type DesktopItem =
  | { kind: "song"; song: SongMemory; gradient: string }
  | { kind: "picture"; picture: PictureMemory };

type AppId = "about" | "notes";

type ArchiveStatus = "loading" | "ready" | "error";
const SERVER_SNAPSHOT = "__memory-archive-loading__";
const EMPTY_SNAPSHOT = "__memory-archive-empty__";
const ARCHIVE_CHANGE_EVENT = "memory-archive-change";

function subscribeToArchive(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ARCHIVE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ARCHIVE_CHANGE_EVENT, callback);
  };
}

function getArchiveSnapshot() {
  return window.localStorage.getItem(MEMORY_STORAGE_KEY) ?? EMPTY_SNAPSHOT;
}

function getServerArchiveSnapshot() {
  return SERVER_SNAPSHOT;
}

function createId(prefix: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That picture could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function compressPicture(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a picture smaller than 10 MB.");
  }

  const source = await readFileAsDataUrl(file);
  const image = new window.Image();
  image.src = source;
  await image.decode();

  const longestSide = Math.max(image.width, image.height);
  const scale = Math.min(1, 1400 / longestSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");

  if (!context) throw new Error("That picture could not be prepared.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.76);
}

/* ————————————————— Menu bar ————————————————— */

function subscribeToClock(callback: () => void) {
  const timer = window.setInterval(callback, 10_000);
  return () => window.clearInterval(timer);
}

function MenuBarClock() {
  const minuteBucket = useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / 30_000),
    () => null,
  );

  if (minuteBucket === null) return <span className="w-28" aria-hidden />;

  const now = new Date(minuteBucket * 30_000);

  const day = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  return (
    <span className="tabular-nums text-ink/80">
      {day}
      <span className="ml-2.5">{time}</span>
    </span>
  );
}

function MenuBar() {
  return (
    <header className="glass-chip fixed inset-x-0 top-0 z-30 flex h-10 items-center justify-between rounded-none border-x-0 border-t-0 px-4 text-[13px] sm:px-6">
      <h1 className="font-semibold tracking-tight">Norraphat Tupiya</h1>
      <p className="hidden text-ink/55 sm:block">
        Things I don&rsquo;t want to lose
      </p>
      <MenuBarClock />
    </header>
  );
}

/* ————————————————— Desktop icons ————————————————— */

function DesktopIcon({
  label,
  onOpen,
  children,
}: {
  label: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="desktop-icon-button group flex w-32 flex-col items-center gap-2 rounded-2xl p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60"
    >
      <span className="icon-squircle block h-[74px] w-[74px] overflow-hidden">
        {children}
      </span>
      <span className="max-w-full truncate text-[13px] font-medium text-ink/85 [text-shadow:0_1px_2px_rgb(255_255_255/80%)]">
        {label}
      </span>
    </button>
  );
}

function SongIconArt({ gradient }: { gradient: string }) {
  return (
    <span
      className="flex h-full w-full items-center justify-center"
      style={{ background: gradient }}
    >
      <Music2 className="h-8 w-8 text-white drop-shadow-sm" />
    </span>
  );
}

function PictureIconArt({ picture }: { picture: PictureMemory }) {
  return (
    <span
      className="block h-full w-full bg-cover bg-center"
      style={{ backgroundImage: `url("${picture.imageUrl}")` }}
    />
  );
}

/* ————————————————— Detail view (work-page style) ————————————————— */

function MetaField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-sm text-ink/55">{children}</p>
    </div>
  );
}

function DetailView({
  item,
  onClose,
}: {
  item: DesktopItem;
  onClose: () => void;
}) {
  const title = item.kind === "song" ? item.song.title : item.picture.caption;
  const note = item.kind === "song" ? item.song.note : item.picture.note;

  return (
    <div className="glass-sheet animate-sheet-in fixed inset-0 z-40 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to desktop"
          className="glass-chip flex h-10 w-10 items-center justify-center rounded-full text-ink/80 transition hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h2>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink/60">{note}</p>

        <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6">
          {item.kind === "song" ? (
            <>
              <MetaField label="Artist">{item.song.artist}</MetaField>
              <MetaField label="Kept since">
                {formatDate(item.song.createdAt)}
              </MetaField>
            </>
          ) : (
            <>
              <MetaField label="Kind">Picture memory</MetaField>
              <MetaField label="Kept since">
                {formatDate(item.picture.createdAt)}
              </MetaField>
            </>
          )}
        </div>

        {item.kind === "song" ? (
          <div className="mt-10">
            {item.song.link ? (
              <a
                href={item.song.link}
                target="_blank"
                rel="noreferrer"
                className="glass-chip inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-[#007aff] transition hover:scale-[1.03] active:scale-95"
              >
                Listen again
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
            <div
              className="icon-squircle mt-10 flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64"
              style={{
                background:
                  item.gradient ?? SONG_ICON_GRADIENTS[0],
              }}
            >
              <Disc3 className="h-20 w-20 animate-[spin_10s_linear_infinite] text-white/90" />
            </div>
          </div>
        ) : (
          <div
            className="mt-10 aspect-[4/5] w-full rounded-3xl bg-cover bg-center shadow-[0_24px_60px_rgb(38_51_92/20%)] sm:aspect-[4/3]"
            style={{ backgroundImage: `url("${item.picture.imageUrl}")` }}
            role="img"
            aria-label={title}
          />
        )}
      </div>
    </div>
  );
}

/* ————————————————— Windows (About / Notes) ————————————————— */

function GlassWindow({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={`Close ${label}`}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/10"
      />
      <div className="glass-panel animate-window-pop relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-[28px]">
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${label} window`}
          className="glass-chip absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink/70 transition hover:scale-105 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="overflow-y-auto p-6 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function AboutWindow({ onClose }: { onClose: () => void }) {
  return (
    <GlassWindow label="About me" onClose={onClose}>
      <h2 className="text-2xl font-semibold tracking-tight">About me</h2>
      <div className="mt-5 flex items-start gap-5">
        <div
          className="icon-squircle flex h-24 w-24 shrink-0 items-center justify-center text-4xl font-semibold text-white"
          style={{ background: SONG_ICON_GRADIENTS[0] }}
        >
          N
        </div>
        <dl className="grid gap-2.5 pt-1 text-sm">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 font-mono text-xs font-semibold uppercase tracking-wide text-ink/80">
              Name
            </dt>
            <dd className="text-ink/55">Norraphat Tupiya</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 font-mono text-xs font-semibold uppercase tracking-wide text-ink/80">
              Keeps
            </dt>
            <dd className="text-ink/55">Songs &amp; pictures</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 font-mono text-xs font-semibold uppercase tracking-wide text-ink/80">
              Mail
            </dt>
            <dd>
              <a className="text-[#007aff]" href="mailto:ntupiya@gmail.com">
                ntupiya@gmail.com
              </a>
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-6 rounded-2xl bg-white/55 p-5 text-sm leading-6 text-ink/70">
        <p>
          This is a small, living archive of songs that changed the air and
          pictures that made time pause.
        </p>
        <p className="mt-4">
          Not the perfect frames — the ones that bring back the temperature,
          the sound, and who was standing just outside the picture. Made for
          returning, not performing.
        </p>
      </div>
    </GlassWindow>
  );
}

function NotesWindow({
  archive,
  onClose,
  onOpenItem,
}: {
  archive: MemoryArchive;
  onClose: () => void;
  onOpenItem: (item: DesktopItem) => void;
}) {
  const rows: { item: DesktopItem; meta: string; yours: boolean }[] = [
    ...archive.songs.map((song) => ({
      item: { kind: "song", song, gradient: SONG_ICON_GRADIENTS[0] } as const,
      meta: song.artist,
      yours: true,
    })),
    ...archive.pictures.map((picture) => ({
      item: { kind: "picture", picture } as const,
      meta: "Picture",
      yours: true,
    })),
    ...FEATURED_SONGS.map((song, index) => ({
      item: {
        kind: "song",
        song,
        gradient: SONG_ICON_GRADIENTS[index % SONG_ICON_GRADIENTS.length],
      } as const,
      meta: song.artist,
      yours: false,
    })),
    ...FEATURED_PICTURES.map((picture) => ({
      item: { kind: "picture", picture } as const,
      meta: "Picture",
      yours: false,
    })),
  ];

  return (
    <GlassWindow label="Notes" onClose={onClose}>
      <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
      <p className="mt-1.5 text-sm text-ink/55">
        Every memory on this desktop, in one list.
      </p>
      <ul className="mt-5 grid gap-1.5">
        {rows.map(({ item, meta, yours }) => {
          const rowTitle =
            item.kind === "song" ? item.song.title : item.picture.caption;
          const date =
            item.kind === "song"
              ? item.song.createdAt
              : item.picture.createdAt;
          return (
            <li key={item.kind === "song" ? item.song.id : item.picture.id}>
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                className="flex w-full items-baseline justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left transition hover:bg-[#ffe9a3]/70 active:bg-[#ffe9a3]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {rowTitle}
                  </span>
                  <span className="block truncate text-xs text-ink/50">
                    {meta}
                    {yours ? " · added here" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink/45">
                  {formatDate(date)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </GlassWindow>
  );
}

/* ————————————————— Add-memory dialogs ————————————————— */

const glassDialogClassName =
  "glass-panel border-0 rounded-[28px] p-6 text-ink sm:max-w-lg";

function SongDialog({ onAdd }: { onAdd: (song: SongMemory) => boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const artist = String(form.get("artist") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    const link = String(form.get("link") ?? "").trim();

    if (!title || !artist || !note) {
      setError("Add a title, artist, and a short memory.");
      return;
    }

    const saved = onAdd({
      id: createId("song"),
      title,
      artist,
      note,
      link: link || undefined,
      createdAt: new Date().toISOString(),
    });

    if (saved) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-ink px-5 text-paper hover:bg-ink/85">
          <Music2 />
          Add a song
        </Button>
      </DialogTrigger>
      <DialogContent className={glassDialogClassName}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Keep a song
          </DialogTitle>
          <DialogDescription>
            Save the track and the moment it belongs to. It stays in this
            browser.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="song-title">Song title</Label>
            <Input id="song-title" name="title" placeholder="Sweet Disposition" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="song-artist">Artist</Label>
            <Input id="song-artist" name="artist" placeholder="The Temper Trap" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="song-note">Why it stays</Label>
            <Textarea
              id="song-note"
              name="note"
              placeholder="The song that made the whole drive feel cinematic."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="song-link">Listening link — optional</Label>
            <Input
              id="song-link"
              name="link"
              type="url"
              placeholder="https://open.spotify.com/..."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" className="rounded-full">
              Save song
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PictureDialog({
  onAdd,
}: {
  onAdd: (picture: PictureMemory) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a picture to keep.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const caption = String(form.get("caption") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    if (!caption || !note) {
      setError("Add a caption and a short memory.");
      return;
    }

    setSaving(true);
    try {
      const imageUrl = await compressPicture(file);
      const saved = onAdd({
        id: createId("picture"),
        caption,
        note,
        imageUrl,
        createdAt: new Date().toISOString(),
      });
      if (saved) {
        setFile(null);
        setOpen(false);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "That picture could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-ink/20 bg-transparent px-5 hover:bg-ink hover:text-paper"
        >
          <ImagePlus />
          Add a picture
        </Button>
      </DialogTrigger>
      <DialogContent className={glassDialogClassName}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Keep a picture
          </DialogTitle>
          <DialogDescription>
            The picture is compressed and saved only in this browser.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="picture-file">Picture</Label>
            <Input
              id="picture-file"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="picture-caption">Caption</Label>
            <Input id="picture-caption" name="caption" placeholder="The blue hour" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="picture-note">What you remember</Label>
            <Textarea
              id="picture-note"
              name="note"
              placeholder="The city went quiet just long enough to notice."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={saving}>
              {saving ? "Preparing picture…" : "Save picture"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ————————————————— Archive widget ————————————————— */

function ArchiveLoading() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-14 rounded-2xl bg-ink/8" />
      <Skeleton className="h-14 rounded-2xl bg-ink/8" />
    </div>
  );
}

function ArchiveWidget({
  archive,
  status,
  storageError,
  onAddSong,
  onAddPicture,
  onOpenItem,
}: {
  archive: MemoryArchive;
  status: ArchiveStatus;
  storageError: string;
  onAddSong: (song: SongMemory) => boolean;
  onAddPicture: (picture: PictureMemory) => boolean;
  onOpenItem: (item: DesktopItem) => void;
}) {
  const hasPersonalMemories =
    archive.songs.length > 0 || archive.pictures.length > 0;

  return (
    <section
      aria-label="Your memory archive"
      className="glass-panel w-full max-w-sm rounded-[28px] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Add what matters now
        </h2>
        <Sparkles className="h-4.5 w-4.5 shrink-0 text-ink/40" />
      </div>
      <p className="mt-1.5 text-[13px] leading-5 text-ink/55">
        New memories stay on this device — private, immediate, ready to
        revisit.
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <SongDialog onAdd={onAddSong} />
        <PictureDialog onAdd={onAddPicture} />
      </div>

      <div className="mt-5 border-t border-ink/10 pt-4">
        {status === "loading" ? <ArchiveLoading /> : null}

        {status === "error" ? (
          <Alert className="rounded-2xl border-destructive/25 bg-destructive/5">
            <AlertTitle>Your saved memories need attention</AlertTitle>
            <AlertDescription>{storageError}</AlertDescription>
          </Alert>
        ) : null}

        {status === "ready" && !hasPersonalMemories ? (
          <div className="flex flex-col items-center rounded-2xl bg-white/50 px-5 py-7 text-center">
            <span className="glass-chip mb-3 flex h-10 w-10 items-center justify-center rounded-full">
              <Plus className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold">A clear page.</h3>
            <p className="mt-1 text-[13px] leading-5 text-ink/55">
              Your first song or picture memory will appear here. Nothing is
              sent anywhere else.
            </p>
          </div>
        ) : null}

        {status === "ready" && hasPersonalMemories ? (
          <ul className="grid max-h-64 gap-1.5 overflow-y-auto">
            {archive.songs.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() =>
                    onOpenItem({
                      kind: "song",
                      song,
                      gradient: SONG_ICON_GRADIENTS[0],
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/60"
                >
                  <span
                    className="icon-squircle flex h-9 w-9 shrink-0 items-center justify-center"
                    style={{ background: SONG_ICON_GRADIENTS[0] }}
                  >
                    <Music2 className="h-4 w-4 text-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {song.title}
                    </span>
                    <span className="block truncate text-xs text-ink/50">
                      {song.artist}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {archive.pictures.map((picture) => (
              <li key={picture.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem({ kind: "picture", picture })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/60"
                >
                  <span
                    className="icon-squircle h-9 w-9 shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: `url("${picture.imageUrl}")` }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {picture.caption}
                    </span>
                    <span className="block truncate text-xs text-ink/50">
                      Picture · kept here
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/* ————————————————— Dock ————————————————— */

function DockButton({
  label,
  onOpen,
  href,
  children,
}: {
  label: string;
  onOpen?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const inner = (
    <>
      <span className="glass-chip animate-tooltip-in pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-ink/80 group-hover:block">
        {label}
      </span>
      <span className="icon-squircle block h-12 w-12 overflow-hidden sm:h-[52px] sm:w-[52px]">
        {children}
      </span>
    </>
  );

  const className =
    "dock-icon group relative block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink/60";

  return href ? (
    <a className={className} href={href} aria-label={label}>
      {inner}
    </a>
  ) : (
    <button type="button" className={className} onClick={onOpen} aria-label={label}>
      {inner}
    </button>
  );
}

function NotesGlyph() {
  return (
    <span className="flex h-full w-full flex-col bg-white">
      <span className="h-1/4 shrink-0 bg-[#ffd60a]/80" />
      <span className="flex flex-1 flex-col justify-center gap-1.5 px-2.5">
        <span className="h-[3px] rounded-full bg-ink/25" />
        <span className="h-[3px] rounded-full bg-ink/15" />
        <span className="h-[3px] w-2/3 rounded-full bg-ink/15" />
      </span>
    </span>
  );
}

function Dock({ onOpenApp }: { onOpenApp: (app: AppId) => void }) {
  return (
    <nav
      aria-label="Dock"
      className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
    >
      <div className="glass-panel flex items-center gap-3 rounded-[26px] px-3.5 py-2.5">
        <DockButton label="About Me" onOpen={() => onOpenApp("about")}>
          <span
            className="flex h-full w-full items-center justify-center text-xl font-semibold text-white"
            style={{ background: SONG_ICON_GRADIENTS[0] }}
          >
            N
          </span>
        </DockButton>
        <DockButton label="Notes" onOpen={() => onOpenApp("notes")}>
          <NotesGlyph />
        </DockButton>
        <span className="h-9 w-px bg-ink/15" aria-hidden />
        <DockButton label="Mail" href="mailto:ntupiya@gmail.com">
          <span
            className="flex h-full w-full items-center justify-center"
            style={{
              background: "linear-gradient(160deg, #6ec1ff 0%, #1f7cf5 100%)",
            }}
          >
            <Mail className="h-6 w-6 text-white" />
          </span>
        </DockButton>
      </div>
    </nav>
  );
}

/* ————————————————— Page ————————————————— */

export function MemoryDesktop() {
  const rawArchive = useSyncExternalStore(
    subscribeToArchive,
    getArchiveSnapshot,
    getServerArchiveSnapshot,
  );
  const [writeError, setWriteError] = useState("");
  const [openApp, setOpenApp] = useState<AppId | null>(null);
  const [detail, setDetail] = useState<DesktopItem | null>(null);

  const parsedArchive = useMemo(() => {
    if (rawArchive === SERVER_SNAPSHOT) {
      return {
        archive: createEmptyArchive(),
        status: "loading" as ArchiveStatus,
        error: "",
      };
    }

    try {
      return {
        archive: parseMemoryArchive(
          rawArchive === EMPTY_SNAPSHOT ? null : rawArchive,
        ),
        status: "ready" as ArchiveStatus,
        error: "",
      };
    } catch (error) {
      return {
        archive: createEmptyArchive(),
        status: "error" as ArchiveStatus,
        error:
          error instanceof Error
            ? error.message
            : "The saved memory archive could not be read.",
      };
    }
  }, [rawArchive]);

  const archive = parsedArchive.archive;
  const status: ArchiveStatus = writeError ? "error" : parsedArchive.status;
  const storageError = writeError || parsedArchive.error;

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (openApp) setOpenApp(null);
      else if (detail) setDetail(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openApp, detail]);

  function persist(next: MemoryArchive) {
    try {
      window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(next));
      setWriteError("");
      window.dispatchEvent(new Event(ARCHIVE_CHANGE_EVENT));
      return true;
    } catch {
      setWriteError(
        "This browser is out of room. Try a smaller picture or remove site data.",
      );
      return false;
    }
  }

  function handleAddSong(song: SongMemory) {
    return persist(addSongMemory(archive, song));
  }

  function handleAddPicture(picture: PictureMemory) {
    return persist(addPictureMemory(archive, picture));
  }

  function openItem(item: DesktopItem) {
    setOpenApp(null);
    setDetail(item);
  }

  return (
    <main className="desktop-wallpaper relative min-h-svh overflow-x-clip">
      <MenuBar />

      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center gap-12 px-5 pb-36 pt-20 lg:flex-row lg:items-start lg:justify-between lg:gap-10 lg:pt-28">
        <div className="flex flex-1 flex-col items-center gap-8 lg:pt-6">
          <p className="max-w-md text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ink/45">
            Personal memory index · 2026
          </p>
          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3">
            {FEATURED_SONGS.map((song, index) => (
              <DesktopIcon
                key={song.id}
                label={song.title}
                onOpen={() =>
                  openItem({
                    kind: "song",
                    song,
                    gradient:
                      SONG_ICON_GRADIENTS[index % SONG_ICON_GRADIENTS.length],
                  })
                }
              >
                <SongIconArt
                  gradient={
                    SONG_ICON_GRADIENTS[index % SONG_ICON_GRADIENTS.length]
                  }
                />
              </DesktopIcon>
            ))}
            {FEATURED_PICTURES.map((picture) => (
              <DesktopIcon
                key={picture.id}
                label={picture.caption}
                onOpen={() => openItem({ kind: "picture", picture })}
              >
                <PictureIconArt picture={picture} />
              </DesktopIcon>
            ))}
          </div>
        </div>

        <ArchiveWidget
          archive={archive}
          status={status}
          storageError={storageError}
          onAddSong={handleAddSong}
          onAddPicture={handleAddPicture}
          onOpenItem={openItem}
        />
      </div>

      <Dock onOpenApp={setOpenApp} />

      {detail ? (
        <DetailView item={detail} onClose={() => setDetail(null)} />
      ) : null}

      {openApp === "about" ? (
        <AboutWindow onClose={() => setOpenApp(null)} />
      ) : null}
      {openApp === "notes" ? (
        <NotesWindow
          archive={archive}
          onClose={() => setOpenApp(null)}
          onOpenItem={openItem}
        />
      ) : null}
    </main>
  );
}
