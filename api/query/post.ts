import initMondayClient from "monday-sdk-js";
import createAPIGatewayProxyHandler from "samepage/backend/createAPIGatewayProxyHandler";

const query = async () => {
  const mondayClient = initMondayClient();
  mondayClient.setToken(process.env.MONDAY_PERSONAL_TOKEN || "");
  const q = `query{
    boards {
      items {
        id
        name
        column_values {
          id
          text
          title
          type
          value
          description
        }
      }
      name
    }
  }`;
  return await mondayClient
    .api(q)
    .then((r) => r.data as Record<string, unknown>);
};

export default createAPIGatewayProxyHandler(query);
