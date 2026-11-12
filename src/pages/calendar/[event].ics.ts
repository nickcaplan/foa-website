import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { buildEventIcs, locationWithAddress } from "../../lib/ics";
import { withBase } from "../../lib/urls";


export const getStaticPaths: GetStaticPaths = async () => {
  const events = await getCollection("events");
  return events.map((entry) => ({ params: { event: entry.id }, props: { entry } }));
};

export const GET: APIRoute = ({ props, site }) => {
  const entry = props.entry as CollectionEntry<"events">;
  const event = entry.data;
  const url = new URL(withBase(event.path ?? "/whats-on/"), site).href;
  const ics = buildEventIcs({
    id: entry.id,
    title: event.title,
    summary: event.summary,
    location: locationWithAddress(event.location),
    start: event.start,
    end: event.calendarEnd ?? event.end,
    allDay: event.allDay,
    status: event.status,
    url,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${entry.id}.ics"`,
    },
  });
};
