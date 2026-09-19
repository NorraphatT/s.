import { describe, expect, it } from "vitest";

import {
  addPictureMemory,
  addSongMemory,
  createEmptyArchive,
  parseMemoryArchive,
} from "./memories";

describe("memory archive", () => {
  it("creates a clean empty archive when nothing has been saved", () => {
    expect(parseMemoryArchive(null)).toEqual(createEmptyArchive());
  });

  it("rejects malformed saved data so the interface can show an error state", () => {
    expect(() => parseMemoryArchive('{"songs":"not-a-list"}')).toThrow(
      "The saved memory archive could not be read.",
    );
  });

  it("adds a song to the beginning without mutating the previous archive", () => {
    const archive = createEmptyArchive();
    const next = addSongMemory(archive, {
      id: "song-1",
      title: "Sunset Lover",
      artist: "Petit Biscuit",
      note: "A soft landing after a long day.",
      link: "https://open.spotify.com/",
      createdAt: "2026-09-19T12:00:00.000Z",
    });

    expect(archive.songs).toHaveLength(0);
    expect(next.songs[0]).toMatchObject({
      id: "song-1",
      title: "Sunset Lover",
      artist: "Petit Biscuit",
    });
  });

  it("adds a picture memory with its locally persisted data URL", () => {
    const next = addPictureMemory(createEmptyArchive(), {
      id: "picture-1",
      caption: "The quiet blue hour",
      note: "Bangkok felt still for a minute.",
      imageUrl: "data:image/jpeg;base64,abc",
      createdAt: "2026-09-19T12:00:00.000Z",
    });

    expect(next.pictures).toHaveLength(1);
    expect(next.pictures[0].imageUrl).toBe("data:image/jpeg;base64,abc");
  });
});
