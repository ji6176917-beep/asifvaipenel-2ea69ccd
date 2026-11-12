import { queryOptions } from "@tanstack/react-query";
import { getGiveaway, getMyTickets } from "./community.functions";
export const giveawayQuery = queryOptions({ queryKey: ["giveaway"], queryFn: () => getGiveaway(), staleTime: 0 });
export const ticketsQuery = queryOptions({ queryKey: ["my-tickets"], queryFn: () => getMyTickets(), staleTime: 0, refetchInterval: 10000 });