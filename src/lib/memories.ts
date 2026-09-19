export type SongMemory = {
  id: string;
  title: string;
  artist: string;
  note: string;
  link?: string;
  createdAt: string;
};

export type PictureMemory = {
  id: string;
  caption: string;
  note: string;
  imageUrl: string;
  createdAt: string;
};

export type MemoryArchive = {
  songs: SongMemory[];
  pictures: PictureMemory[];
};

export const MEMORY_STORAGE_KEY = "norraphat-memory-archive-v1";

export function createEmptyArchive(): MemoryArchive {
  return { songs: [], pictures: [] };
}

function isSongMemory(value: unknown): value is SongMemory {
  if (!value || typeof value !== "object") return false;
  const song = value as Record<string, unknown>;
  return (
    typeof song.id === "string" &&
    typeof song.title === "string" &&
    typeof song.artist === "string" &&
    typeof song.note === "string" &&
    (song.link === undefined || typeof song.link === "string") &&
    typeof song.createdAt === "string"
  );
}

function isPictureMemory(value: unknown): value is PictureMemory {
  if (!value || typeof value !== "object") return false;
  const picture = value as Record<string, unknown>;
  return (
    typeof picture.id === "string" &&
    typeof picture.caption === "string" &&
    typeof picture.note === "string" &&
    typeof picture.imageUrl === "string" &&
    typeof picture.createdAt === "string"
  );
}

export function parseMemoryArchive(raw: string | null): MemoryArchive {
  if (raw === null) return createEmptyArchive();

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !parsed ||
      !Array.isArray(parsed.songs) ||
      !Array.isArray(parsed.pictures) ||
      !parsed.songs.every(isSongMemory) ||
      !parsed.pictures.every(isPictureMemory)
    ) {
      throw new Error("invalid archive");
    }

    return {
      songs: parsed.songs,
      pictures: parsed.pictures,
    };
  } catch {
    throw new Error("The saved memory archive could not be read.");
  }
}

export function addSongMemory(
  archive: MemoryArchive,
  song: SongMemory,
): MemoryArchive {
  return { ...archive, songs: [song, ...archive.songs] };
}

export function addPictureMemory(
  archive: MemoryArchive,
  picture: PictureMemory,
): MemoryArchive {
  return { ...archive, pictures: [picture, ...archive.pictures] };
}
