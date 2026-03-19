import { NextRouter } from 'next/router';
import { useMutation } from 'react-query';

type FetchPayload = {
   competitorDomain: string,
   maxPosition?: number,
   limit?: number,
};

type CompetitorsResponse = {
   data: CompetitorData | null,
   error?: string | null,
};

async function fetchCompetitorKeywords(
   router: NextRouter,
   payload: FetchPayload,
): Promise<CompetitorsResponse> {
   const res = await fetch(`${window.location.origin}/api/competitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
   });
   if (res.status === 401) {
      router.push('/login');
      throw new Error('Unauthorized');
   }
   if (res.status >= 400) {
      const data = await res.json();
      throw new Error(data.error || 'Error fetching competitor keywords');
   }
   return res.json();
}

export function useFetchCompetitorKeywords(router: NextRouter) {
   return useMutation(
      (payload: FetchPayload) => fetchCompetitorKeywords(router, payload),
   );
}
