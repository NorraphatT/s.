"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Camera,
  Disc3,
  ImagePlus,
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

type ArchiveStatus = "loading" | "ready" | "error";

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

function SectionLabel({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/55">
      <span>{index}</span>
      <span className="h-px w-7 bg-ink/25" />
      <span>{children}</span>
    </div>
  );
}

function SongCard({
  song,
  index,
  personal = false,
}: {
  song: SongMemory;
  index: number;
  personal?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-6">
        <span className="font-mono text-[10px] tracking-[0.18em] text-ink/45">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 transition group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
          {song.link ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Music2 className="h-3.5 w-3.5" />}
        </span>
      </div>
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
          {personal ? "Added here" : formatDate(song.createdAt)}
        </p>
        <h3 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-[0.94] tracking-[-0.035em]">
          {song.title}
        </h3>
        <p className="mt-2 text-sm font-medium">{song.artist}</p>
      </div>
      <p className="max-w-sm text-sm leading-6 text-ink/60">{song.note}</p>
    </>
  );

  const className =
    "group flex min-h-[360px] flex-col justify-between border-t border-ink/20 py-5 transition-colors md:min-h-[410px]";

  return song.link ? (
    <a className={className} href={song.link} rel="noreferrer" target="_blank">
      {content}
    </a>
  ) : (
    <article className={className}>{content}</article>
  );
}

function PictureCard({
  picture,
  className = "",
}: {
  picture: PictureMemory;
  className?: string;
}) {
  return (
    <article className={`group ${className}`}>
      <div
        className="aspect-[4/5] overflow-hidden bg-clay bg-cover bg-center transition-transform duration-700 group-hover:scale-[0.985]"
        style={{ backgroundImage: `url("${picture.imageUrl}")` }}
        role="img"
        aria-label={picture.caption}
      />
      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <h3 className="font-serif text-2xl leading-none tracking-[-0.02em]">
            {picture.caption}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink/60">
            {picture.note}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
          {formatDate(picture.createdAt)}
        </span>
      </div>
    </article>
  );
}

function SongDialog({
  onAdd,
}: {
  onAdd: (song: SongMemory) => boolean;
}) {
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
      <DialogContent className="border-0 bg-paper p-6 text-ink ring-1 ring-ink/15 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl">Keep a song</DialogTitle>
          <DialogDescription>
            Save the track and the moment it belongs to. It stays in this browser.
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
          <DialogFooter className="-mx-6 -mb-6 px-6">
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
        caught instanceof Error ? caught.message : "That picture could not be saved.",
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
      <DialogContent className="border-0 bg-paper p-6 text-ink ring-1 ring-ink/15 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl">Keep a picture</DialogTitle>
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
            <Input
              id="picture-caption"
              name="caption"
              placeholder="The blue hour"
            />
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
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button type="submit" className="rounded-full" disabled={saving}>
              {saving ? "Preparing picture…" : "Save picture"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveLoading() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Skeleton className="h-72 rounded-none bg-ink/8" />
      <Skeleton className="h-72 rounded-none bg-ink/8" />
    </div>
  );
}

export function MemoryPage() {
  const [archive, setArchive] = useState<MemoryArchive>(createEmptyArchive);
  const [status, setStatus] = useState<ArchiveStatus>("loading");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      setArchive(parseMemoryArchive(window.localStorage.getItem(MEMORY_STORAGE_KEY)));
      setStatus("ready");
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? error.message
          : "The saved memory archive could not be read.",
      );
      setStatus("error");
    }
  }, []);

  function persist(next: MemoryArchive) {
    try {
      window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(next));
      setArchive(next);
      setStorageError("");
      setStatus("ready");
      return true;
    } catch {
      setStorageError(
        "This browser is out of room. Try a smaller picture or remove site data.",
      );
      setStatus("error");
      return false;
    }
  }

  function handleAddSong(song: SongMemory) {
    return persist(addSongMemory(archive, song));
  }

  function handleAddPicture(picture: PictureMemory) {
    return persist(addPictureMemory(archive, picture));
  }

  const hasPersonalMemories =
    archive.songs.length > 0 || archive.pictures.length > 0;

  return (
    <main>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink/15 bg-paper/95 px-5 backdrop-blur md:px-10">
        <a
          href="#top"
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]"
        >
          Norraphat Tupiya
        </a>
        <nav className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-[0.18em] md:flex">
          <a className="hover:opacity-55" href="#songs">
            Songs
          </a>
          <a className="hover:opacity-55" href="#pictures">
            Pictures
          </a>
          <a className="hover:opacity-55" href="#yours">
            Add yours
          </a>
        </nav>
        <a
          href="#yours"
          className="flex h-9 items-center gap-2 rounded-full border border-ink/20 px-4 font-mono text-[10px] uppercase tracking-[0.12em] transition hover:bg-ink hover:text-paper"
        >
          <Plus className="h-3.5 w-3.5" />
          Keep a memory
        </a>
      </header>

      <section
        id="top"
        className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-between overflow-hidden px-5 py-8 md:px-10 md:py-10"
      >
        <div className="flex items-start justify-between">
          <p className="max-w-[24rem] text-sm leading-6 text-ink/60">
            A small, living archive of songs that changed the air and pictures
            that made time pause.
          </p>
          <Disc3 className="hidden h-12 w-12 animate-[spin_12s_linear_infinite] md:block" />
        </div>

        <div className="relative py-16 md:py-10">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
            Personal memory index · 2026
          </p>
          <h1 className="max-w-[15ch] font-serif text-[clamp(4rem,10.7vw,10rem)] leading-[0.78] tracking-[-0.065em]">
            Things I don’t want to lose.
          </h1>
          <Sparkles className="absolute bottom-[11%] right-[7%] h-8 w-8 text-signal md:h-12 md:w-12" />
        </div>

        <div className="flex items-end justify-between border-t border-ink/20 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
            Scroll through the keepsakes
          </p>
          <a
            href="#songs"
            aria-label="Scroll to songs"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-signal text-white transition hover:translate-y-1"
          >
            <ArrowDown className="h-5 w-5" />
          </a>
        </div>
      </section>

      <section className="overflow-hidden border-y border-ink bg-ink py-4 text-paper">
        <div className="ticker-track flex w-max items-center gap-7 whitespace-nowrap font-serif text-3xl italic md:text-4xl">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-7" aria-hidden={copy === 1}>
              <span>play it again</span>
              <Disc3 className="h-5 w-5" />
              <span>hold that frame</span>
              <Camera className="h-5 w-5" />
              <span>keep the feeling</span>
              <Sparkles className="h-5 w-5 text-signal" />
            </div>
          ))}
        </div>
      </section>

      <section id="songs" className="scroll-mt-16 px-5 py-24 md:px-10 md:py-32">
        <div className="mb-16 grid gap-8 md:grid-cols-[1fr_2fr]">
          <SectionLabel index="01">Songs on repeat</SectionLabel>
          <div>
            <h2 className="max-w-[11ch] font-serif text-[clamp(3.5rem,7vw,7rem)] leading-[0.84] tracking-[-0.055em]">
              Every memory needs a soundtrack.
            </h2>
            <p className="mt-7 max-w-xl text-base leading-7 text-ink/60">
              Three songs for the nights, drives, and quiet mornings that still
              feel close. Open one when you want to hear it again.
            </p>
          </div>
        </div>
        <div className="grid gap-x-8 md:grid-cols-3">
          {FEATURED_SONGS.map((song, index) => (
            <SongCard key={song.id} song={song} index={index} />
          ))}
        </div>
      </section>

      <section
        id="pictures"
        className="scroll-mt-16 bg-clay px-5 py-24 md:px-10 md:py-32"
      >
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SectionLabel index="02">Pictures worth keeping</SectionLabel>
            <h2 className="mt-8 max-w-[11ch] font-serif text-[clamp(3.5rem,7vw,7rem)] leading-[0.84] tracking-[-0.055em]">
              Proof that I was here.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink/60">
            Not the perfect frames. The ones that bring back the temperature,
            the sound, and who was standing just outside the picture.
          </p>
        </div>
        <div className="grid gap-12 md:grid-cols-12 md:items-start">
          <PictureCard
            picture={FEATURED_PICTURES[0]}
            className="md:col-span-7"
          />
          <PictureCard
            picture={FEATURED_PICTURES[1]}
            className="md:col-span-4 md:col-start-9 md:mt-32"
          />
          <PictureCard
            picture={FEATURED_PICTURES[2]}
            className="md:col-span-5 md:col-start-3 md:mt-8"
          />
        </div>
      </section>

      <section
        id="yours"
        className="scroll-mt-16 px-5 py-24 md:px-10 md:py-32"
      >
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <SectionLabel index="03">The open page</SectionLabel>
          </div>
          <div>
            <h2 className="max-w-[12ch] font-serif text-[clamp(3.5rem,7vw,7rem)] leading-[0.84] tracking-[-0.055em]">
              Add what matters now.
            </h2>
            <p className="mt-7 max-w-xl text-base leading-7 text-ink/60">
              New memories stay on this device—private, immediate, and ready to
              revisit whenever this page comes back around.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SongDialog onAdd={handleAddSong} />
              <PictureDialog onAdd={handleAddPicture} />
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-ink/20 pt-8">
          {status === "loading" ? <ArchiveLoading /> : null}

          {status === "error" ? (
            <Alert className="rounded-none border-signal/35 bg-signal/8">
              <AlertTitle>Your saved memories need attention</AlertTitle>
              <AlertDescription>{storageError}</AlertDescription>
            </Alert>
          ) : null}

          {status === "ready" && !hasPersonalMemories ? (
            <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-ink/25 px-6 text-center">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-clay">
                <Plus className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-3xl">A clear page.</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-ink/55">
                Your first song or picture memory will appear here. Nothing is
                sent anywhere else.
              </p>
            </div>
          ) : null}

          {status === "ready" && hasPersonalMemories ? (
            <div className="grid gap-16">
              {archive.songs.length > 0 ? (
                <div>
                  <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                    Songs you added · {archive.songs.length}
                  </p>
                  <div className="grid gap-x-8 md:grid-cols-3">
                    {archive.songs.map((song, index) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        index={index}
                        personal
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {archive.pictures.length > 0 ? (
                <div>
                  <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                    Pictures you added · {archive.pictures.length}
                  </p>
                  <div className="grid gap-12 md:grid-cols-2">
                    {archive.pictures.map((picture) => (
                      <PictureCard key={picture.id} picture={picture} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <footer className="bg-ink px-5 py-12 text-paper md:px-10">
        <div className="flex flex-col justify-between gap-12 md:flex-row md:items-end">
          <div>
            <p className="font-serif text-5xl leading-none tracking-[-0.04em] md:text-7xl">
              Until next time.
            </p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-paper/55">
              A personal archive by Norraphat Tupiya. Made for returning, not
              performing.
            </p>
          </div>
          <a
            href="#top"
            className="flex items-center gap-3 self-start font-mono text-[10px] uppercase tracking-[0.18em] md:self-auto"
          >
            Back to the beginning
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/25">
              <ArrowDown className="h-4 w-4 rotate-180" />
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}
