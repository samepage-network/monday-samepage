import initMondayClient from "monday-sdk-js";
import { z } from "zod";

const zSchema = z.object({
  boards: z
    .object({ items: z.object({ id: z.string(), name: z.string() }).array() })
    .array(),
});

const query = () => {
  const mondayClient = initMondayClient();
  mondayClient.setToken(process.env.MONDAY_PERSONAL_TOKEN || "");
  const q = `query{
    boards {
      items {
        id
        name
      }
    }
  }`;
  return mondayClient
    .api(q)
    .then((r) => zSchema.parse(r.data).boards.map((b) => b.items));
};

export default query;
