import { DOMParser, HTMLDocument } from "@b-fuze/deno-dom";

const BASE_URL = "https://fishingonorfu.hu";

const PAGES = [
  [
    Temporal.PlainDate.from("2025-06-25"),
    `${BASE_URL}/fellepok/napi-bontas/szerda`,
  ],
  [
    Temporal.PlainDate.from("2025-06-26"),
    `${BASE_URL}/fellepok/napi-bontas/csutortok`,
  ],
  [
    Temporal.PlainDate.from("2025-06-27"),
    `${BASE_URL}/fellepok/napi-bontas/pentek`,
  ],
  [
    Temporal.PlainDate.from("2025-06-28"),
    `${BASE_URL}/fellepok/napi-bontas/szombat`,
  ],
] as const;

const fetchDocument = async (url: string) => {
  const response = await fetch(url);
  const text = await response.text();
  return new DOMParser().parseFromString(text, "text/html");
};

interface Performer {
  performer: {
    description: string;
    youtube_url?: string;
  };
}
const fetchPerformer = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  return await response.json() as Performer;
};

interface Act {
  stage: string;
  start: string;
  end: string;
  act: string;
  blurb?: string;
  url?: string;
}

const parsePage = async (
  date: Temporal.PlainDate,
  document: HTMLDocument,
): Promise<Act[]> => {
  const performers = document.querySelectorAll(".program-performer");

  return await Promise.all(
    Array.from(performers)
      .map(async (performer) => {
        const act = performer.querySelector(".program-performer-name")
          ?.innerText
          ?.trim() ??
          throw_();
        const durationString = performer.querySelector(".program-duration")
          ?.innerText ??
          throw_();
        const [startTime, endTime] = durationString
          .split("-")
          .map((s) => s.trim())
          .map((s) => Temporal.PlainTime.from(s));
        const stageSection = performer.closest(".program-stage-section") ??
          throw_();
        const stage = stageSection.querySelector(".program-stage-label")
          ?.innerText
          ?.trim() ??
          throw_();
        const realStartDate = startTime.hour < 6 ? date.add({ days: 1 }) : date;
        const realEndDate = endTime.hour < 6 ? date.add({ days: 1 }) : date;

        const performerLinkDataUrl =
          performer.querySelector(".program-performer-link")
            ?.getAttribute("data-url") ??
            throw_();
        const { performer: { description, youtube_url } } =
          await fetchPerformer(performerLinkDataUrl);
        const blurb = new DOMParser().parseFromString(description, "text/html")
          .textContent.trim();

        return {
          stage,
          start: `${realStartDate.toString()} ${startTime.toString()}`,
          end: `${realEndDate.toString()} ${endTime.toString()}`,
          act,
          blurb,
          ...youtube_url ? { url: youtube_url } : {},
        };
      }),
  );
};

const data = await Promise.all(
  PAGES.map(async ([date, url]) => {
    const document = await fetchDocument(url);
    return await parsePage(date, document);
  }),
);

for (const act of data.flat()) {
  console.log(`act = ${JSON.stringify(act)}`);
}

const throw_ = () => {
  throw new Error();
};
