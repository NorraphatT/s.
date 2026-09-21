"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Disc3,
  ImagePlus,
  Images,
  Mail,
  Music2,
  Plus,
  Sparkles,
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

const CONTACT_EMAIL = "ntupiya@gmail.com";

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

const SONG_GRADIENTS = [
  "linear-gradient(140deg, #7cb8ff 0%, #5a8dee 55%, #7f6bff 100%)",
  "linear-gradient(140deg, #ff9ec3 0%, #ff6f91 55%, #c86dd7 100%)",
  "linear-gradient(140deg, #9be8d8 0%, #4fc3a1 55%, #3f9fbf 100%)",
];

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

/* ————————————————— Live clock ————————————————— */

function subscribeToClock(callback: () => void) {
  const timer = window.setInterval(callback, 10_000);
  return () => window.clearInterval(timer);
}

function useMinuteBucket() {
  return useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / 30_000),
    () => null,
  );
}

function HeroClock() {
  const minuteBucket = useMinuteBucket();

  if (minuteBucket === null) {
    return <span className="block h-5" aria-hidden />;
  }

  const now = new Date(minuteBucket * 30_000);
  const formatted = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return (
    <p className="font-mono text-[13px] uppercase tracking-[0.28em] text-ink/50 tabular-nums">
      {formatted}
    </p>
  );
}

function BangkokClock() {
  const minuteBucket = useMinuteBucket();

  if (minuteBucket === null) {
    return <span className="block h-12" aria-hidden />;
  }

  const now = new Date(minuteBucket * 30_000);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(now);

  return (
    <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
      {time}
    </p>
  );
}

/* ————————————————— Scroll reveal ————————————————— */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} reveal-item transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0.35,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ————————————————— Cards ————————————————— */

function BentoCard({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`glass-panel relative overflow-hidden rounded-[28px] ${
        interactive
          ? "transition-transform duration-300 ease-out hover:-translate-y-1"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function CornerArrow() {
  return (
    <span className="glass-chip absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <ArrowUpRight className="h-4 w-4" />
    </span>
  );
}

function NowCard() {
  return (
    <BentoCard className="flex flex-col justify-between p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink/55">Now in Bangkok</p>
        <span className="glass-chip flex h-8 w-8 items-center justify-center rounded-full">
          <Sparkles className="h-3.5 w-3.5 text-ink/60" />
        </span>
      </div>
      <div className="pt-10">
        <BangkokClock />
        <p className="mt-1.5 text-sm text-ink/50">
          Where most of these memories were made.
        </p>
      </div>
    </BentoCard>
  );
}

function EmailCard() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  }

  return (
    <BentoCard interactive className="group">
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-full w-full flex-col justify-between p-6 text-left"
      >
        <span className="glass-chip flex h-10 w-10 items-center justify-center rounded-full">
          {copied ? (
            <Check className="h-4 w-4 text-[#34a853]" />
          ) : (
            <Mail className="h-4 w-4 text-ink/60" />
          )}
        </span>
        <span className="pt-10">
          <span className="block text-base font-semibold tracking-tight">
            {copied ? "Copied email" : "ntupiya"}
          </span>
          <span className="block text-sm text-ink/50">
            {copied ? "to clipboard" : "@gmail.com"}
          </span>
        </span>
        <span className="glass-chip absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Copy className="h-3.5 w-3.5" />
        </span>
      </button>
    </BentoCard>
  );
}

function TaglineCard() {
  return (
    <BentoCard className="flex items-center p-7 sm:col-span-2">
      <p className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
        A small, living archive of songs that changed the air and pictures
        that made time pause.{" "}
        <span className="text-ink/40">
          Made for returning, not performing.
        </span>
      </p>
    </BentoCard>
  );
}

function SongCard({ song, gradient }: { song: SongMemory; gradient: string }) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span
          className="icon-squircle flex h-11 w-11 items-center justify-center"
          style={{ background: gradient }}
        >
          <Music2 className="h-5 w-5 text-white" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/40">
          On repeat
        </span>
      </div>
      <div className="pt-9">
        <p className="text-base font-semibold tracking-tight">{song.title}</p>
        <p className="text-sm text-ink/50">{song.artist}</p>
        <p className="mt-3 text-[13px] leading-5 text-ink/55">{song.note}</p>
      </div>
      <CornerArrow />
    </>
  );

  return (
    <BentoCard interactive className="group">
      {song.link ? (
        <a
          href={song.link}
          target="_blank"
          rel="noreferrer"
          className="flex h-full flex-col justify-between p-6"
        >
          {inner}
        </a>
      ) : (
        <div className="flex h-full flex-col justify-between p-6">{inner}</div>
      )}
    </BentoCard>
  );
}

function PictureCard({
  picture,
  className = "",
  tall = false,
}: {
  picture: PictureMemory;
  className?: string;
  tall?: boolean;
}) {
  return (
    <BentoCard interactive className={`group ${className}`}>
      <div className={`relative ${tall ? "min-h-[420px]" : "min-h-[260px]"} h-full w-full`}>
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]"
          style={{ backgroundImage: `url("${picture.imageUrl}")` }}
          role="img"
          aria-label={picture.caption}
        />
        <div className="absolute inset-x-4 bottom-4">
          <div className="glass-chip rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold tracking-tight">
              {picture.caption}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink/55">
              {picture.note}
            </p>
          </div>
        </div>
        <span className="glass-chip absolute right-4 top-4 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">
          {formatDate(picture.createdAt)}
        </span>
      </div>
    </BentoCard>
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

/* ————————————————— Archive cards ————————————————— */

function KeepMemoryCard({
  onAddSong,
  onAddPicture,
}: {
  onAddSong: (song: SongMemory) => boolean;
  onAddPicture: (picture: PictureMemory) => boolean;
}) {
  return (
    <BentoCard className="flex flex-col justify-between p-6 sm:col-span-2" >
      <div>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight">
            Add what matters now
          </p>
          <span className="glass-chip flex h-8 w-8 items-center justify-center rounded-full">
            <Plus className="h-4 w-4 text-ink/60" />
          </span>
        </div>
        <p className="mt-1.5 max-w-md text-sm leading-6 text-ink/55">
          New memories stay on this device — private, immediate, and ready to
          revisit whenever this page comes back around.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <SongDialog onAdd={onAddSong} />
        <PictureDialog onAdd={onAddPicture} />
      </div>
    </BentoCard>
  );
}

function ArchiveLoading() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-12 rounded-2xl bg-ink/8" />
      <Skeleton className="h-12 rounded-2xl bg-ink/8" />
    </div>
  );
}

function ArchiveCard({
  archive,
  status,
  storageError,
}: {
  archive: MemoryArchive;
  status: ArchiveStatus;
  storageError: string;
}) {
  const hasPersonalMemories =
    archive.songs.length > 0 || archive.pictures.length > 0;

  return (
    <BentoCard className="p-6">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold tracking-tight">Kept here</p>
        <span className="glass-chip flex h-8 w-8 items-center justify-center rounded-full">
          <Images className="h-4 w-4 text-ink/60" />
        </span>
      </div>

      <div className="mt-5">
        {status === "loading" ? <ArchiveLoading /> : null}

        {status === "error" ? (
          <Alert className="rounded-2xl border-destructive/25 bg-destructive/5">
            <AlertTitle>Your saved memories need attention</AlertTitle>
            <AlertDescription>{storageError}</AlertDescription>
          </Alert>
        ) : null}

        {status === "ready" && !hasPersonalMemories ? (
          <div className="rounded-2xl bg-white/50 px-5 py-6 text-center">
            <h3 className="text-base font-semibold">A clear page.</h3>
            <p className="mt-1 text-[13px] leading-5 text-ink/55">
              Your first song or picture memory will appear here. Nothing is
              sent anywhere else.
            </p>
          </div>
        ) : null}

        {status === "ready" && hasPersonalMemories ? (
          <ul className="grid max-h-72 gap-1.5 overflow-y-auto">
            {archive.songs.map((song) => (
              <li
                key={song.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2"
              >
                <span
                  className="icon-squircle flex h-9 w-9 shrink-0 items-center justify-center"
                  style={{ background: SONG_GRADIENTS[0] }}
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
              </li>
            ))}
            {archive.pictures.map((picture) => (
              <li
                key={picture.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2"
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
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </BentoCard>
  );
}

/* ————————————————— Hero ————————————————— */

function Hero() {
  return (
    <section className="relative flex flex-col items-center px-5 pb-14 pt-16 sm:pt-20">
      <HeroClock />

      <div className="relative mt-6 flex w-full max-w-4xl flex-col items-center">
        <h1 className="select-none text-center font-semibold leading-[0.92] tracking-[-0.04em] text-ink/[0.07]">
          <span className="block text-[clamp(4rem,14vw,11rem)]">Norraphat</span>
          <span className="block text-[clamp(4rem,14vw,11rem)]">Tupiya</span>
        </h1>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="glass-panel flex h-32 w-32 items-center justify-center rounded-full sm:h-40 sm:w-40">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full sm:h-30 sm:w-30"
                style={{ background: SONG_GRADIENTS[0] }}
              >
                <Disc3 className="h-12 w-12 animate-[spin_14s_linear_infinite] text-white/90 sm:h-14 sm:w-14" />
              </div>
            </div>
            <span className="glass-chip absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full">
              <Sparkles className="h-4 w-4 text-[#007aff]" />
            </span>
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-md text-center text-[15px] leading-6 text-ink/55">
        Personal memory index — things I don&rsquo;t want to lose, kept in one
        quiet place.
      </p>

      <nav aria-label="Quick links" className="mt-8 flex w-full max-w-xl gap-3">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          aria-label="Email"
          className="glass-panel flex h-16 flex-1 items-center justify-center rounded-2xl text-ink/60 transition hover:-translate-y-0.5 hover:text-ink"
        >
          <Mail className="h-5 w-5" />
        </a>
        <a
          href="#songs"
          aria-label="Songs"
          className="glass-panel flex h-16 flex-1 items-center justify-center rounded-2xl text-ink/60 transition hover:-translate-y-0.5 hover:text-ink"
        >
          <Music2 className="h-5 w-5" />
        </a>
        <a
          href="#pictures"
          aria-label="Pictures"
          className="glass-panel flex h-16 flex-1 items-center justify-center rounded-2xl text-ink/60 transition hover:-translate-y-0.5 hover:text-ink"
        >
          <Images className="h-5 w-5" />
        </a>
        <a
          href="#keep"
          aria-label="Keep a memory"
          className="glass-panel flex h-16 flex-1 items-center justify-center rounded-2xl text-ink/60 transition hover:-translate-y-0.5 hover:text-ink"
        >
          <Plus className="h-5 w-5" />
        </a>
      </nav>
    </section>
  );
}

/* ————————————————— Page ————————————————— */

export function MemoryBento() {
  const rawArchive = useSyncExternalStore(
    subscribeToArchive,
    getArchiveSnapshot,
    getServerArchiveSnapshot,
  );
  const [writeError, setWriteError] = useState("");

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

  return (
    <main className="desktop-wallpaper relative min-h-svh overflow-x-clip">
      <div className="relative">
        <Hero />

        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-5 pb-10 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal>
            <NowCard />
          </Reveal>
          <Reveal delay={60}>
            <EmailCard />
          </Reveal>
          <Reveal className="sm:col-span-2 lg:col-span-1" delay={120}>
            <BentoCard className="flex h-full flex-col justify-between p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
                Personal memory index
              </p>
              <p className="pt-8 text-lg font-semibold leading-snug tracking-tight">
                Things I don&rsquo;t want to lose.
              </p>
            </BentoCard>
          </Reveal>

          <Reveal className="sm:col-span-2 lg:col-span-3">
            <TaglineCard />
          </Reveal>

          <div id="songs" className="scroll-mt-8 sm:col-span-2 lg:col-span-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_SONGS.map((song, index) => (
                <Reveal key={song.id} delay={index * 70}>
                  <SongCard
                    song={song}
                    gradient={SONG_GRADIENTS[index % SONG_GRADIENTS.length]}
                  />
                </Reveal>
              ))}
            </div>
          </div>

          <div
            id="pictures"
            className="scroll-mt-8 sm:col-span-2 lg:col-span-3"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Reveal className="sm:col-span-2 sm:row-span-2 lg:col-span-2">
                <PictureCard picture={FEATURED_PICTURES[0]} tall className="h-full" />
              </Reveal>
              <Reveal delay={80}>
                <PictureCard picture={FEATURED_PICTURES[1]} />
              </Reveal>
              <Reveal delay={140}>
                <PictureCard picture={FEATURED_PICTURES[2]} />
              </Reveal>
            </div>
          </div>

          <div id="keep" className="scroll-mt-8 sm:col-span-2 lg:col-span-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Reveal className="sm:col-span-2">
                <KeepMemoryCard
                  onAddSong={handleAddSong}
                  onAddPicture={handleAddPicture}
                />
              </Reveal>
              <Reveal className="sm:col-span-2 lg:col-span-1" delay={80}>
                <ArchiveCard
                  archive={archive}
                  status={status}
                  storageError={storageError}
                />
              </Reveal>
            </div>
          </div>
        </div>

        <footer className="px-5 pb-12 pt-4 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/40">
            A personal archive by Norraphat Tupiya · Until next time
          </p>
        </footer>
      </div>
    </main>
  );
}
