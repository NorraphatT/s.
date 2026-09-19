import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = "http://127.0.0.1:43127";
const mediaDir =
  "/Users/sonsalabim/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-de1aaf71-9d79-4671-877a-b8e1ba07e7e6/files/media";
const storageKey = "norraphat-memory-archive-v1";

test.beforeAll(async () => {
  await mkdir(mediaDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto(baseURL);
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload();
  await expect(page.getByText("A clear page.")).toBeVisible();
});

test("adds and persists song and picture memories", async ({ page }) => {
  await page.getByRole("button", { name: "Add a song" }).click();
  await page.getByLabel("Song title").fill("Sweet Disposition");
  await page.getByLabel("Artist").fill("The Temper Trap");
  await page
    .getByLabel("Why it stays")
    .fill("The song that made the whole drive feel cinematic.");
  await page.getByRole("button", { name: "Save song" }).click();
  await expect(page.getByText("Sweet Disposition")).toBeVisible();

  await page.getByRole("button", { name: "Add a picture" }).click();
  await page.getByLabel("Picture").setInputFiles({
    name: "blue-hour.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgQCAZPL3u8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Caption").fill("The blue hour");
  await page
    .getByLabel("What you remember")
    .fill("The city went quiet just long enough to notice.");
  await page.getByRole("button", { name: "Save picture" }).click();
  await expect(page.getByText("The blue hour")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Sweet Disposition")).toBeVisible();
  await expect(page.getByText("The blue hour")).toBeVisible();
});

test("shows a recovery state for unreadable local data", async ({ page }) => {
  await page.evaluate(
    ({ key }) => localStorage.setItem(key, '{"songs":"broken"}'),
    { key: storageKey },
  );
  await page.reload();

  await expect(
    page.getByText("Your saved memories need attention"),
  ).toBeVisible();
  await expect(
    page.getByText("The saved memory archive could not be read."),
  ).toBeVisible();
});

test("fits desktop and mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(baseURL);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(mediaDir, "norraphat-memory-desktop.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(mediaDir, "norraphat-memory-mobile.png"),
    fullPage: false,
  });
});
