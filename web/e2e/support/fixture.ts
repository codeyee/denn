import type { APIRequestContext } from "@playwright/test";

const fixtureCorePort = process.env.E2E_FIXTURE_CORE_PORT ?? "18000";

export const fixtureUrl = `http://127.0.0.1:${fixtureCorePort}`;

export interface FixtureRequest {
  service: "core" | "proxy";
  method: string;
  path: string;
  query: string;
  request_id: string;
  consumer: string | null;
  catalog_visitor: string | null;
}

export async function resetFixture(request: APIRequestContext) {
  const response = await request.post(`${fixtureUrl}/__fixture__/reset`);
  if (!response.ok()) {
    throw new Error(`Fixture reset failed (${response.status()})`);
  }
}

export async function fetchFixtureRequests(request: APIRequestContext) {
  const response = await request.get(`${fixtureUrl}/__fixture__/requests`);
  if (!response.ok()) {
    throw new Error(`Fixture request log failed (${response.status()})`);
  }
  return response.json() as Promise<FixtureRequest[]>;
}
