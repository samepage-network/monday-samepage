import initMondayClient from "monday-sdk-js";
import { z } from "zod";
import createAPIGatewayProxyHandler from "samepage/backend/createAPIGatewayProxyHandler";

const zSchema = z.object({
  boards: z
    .object({ items: z.object({ id: z.string(), name: z.string() }).array() })
    .array(),
});

const query = async () => {
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
  const boards = await mondayClient
    .api(q)
    .then((r) => zSchema.parse(r.data).boards.map((b) => b.items));
  return { boards };
};

export default createAPIGatewayProxyHandler(query);
