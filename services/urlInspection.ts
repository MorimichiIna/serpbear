import { NextRouter } from 'next/router';
import { useMutation } from 'react-query';

type InspectPayload = {
   domain: string,
   urls: string[],
};

type InspectResponse = {
   data: URLInspectionResult[],
   error?: string | null,
};

async function fetchURLInspection(router: NextRouter, payload: InspectPayload): Promise<InspectResponse> {
   const res = await fetch(`${window.location.origin}/api/inspect`, {
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
      throw new Error(data.error || 'Error inspecting URLs');
   }
   return res.json();
}

export function useInspectURLs(router: NextRouter) {
   return useMutation((payload: InspectPayload) => fetchURLInspection(router, payload));
}
