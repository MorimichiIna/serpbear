import type { NextApiRequest, NextApiResponse } from 'next';
import { readFile, writeFile } from 'fs/promises';
import verifyUser from '../../utils/verifyUser';
import { getAppSettings } from './settings';

type CompetitorsRes = {
   data: CompetitorData | null,
   error?: string | null,
}

const getFilePath = (domain: string) => {
   const safe = domain.replaceAll('/', '-').replaceAll('.', '-');
   return `${process.cwd()}/data/COMPETITORS_${safe}.json`;
};

const readSavedData = async (domain: string): Promise<CompetitorData | null> => {
   try {
      const raw = await readFile(getFilePath(domain), { encoding: 'utf-8' });
      return JSON.parse(raw);
   } catch {
      return null;
   }
};

const saveData = async (domain: string, data: CompetitorData) => {
   try {
      await writeFile(getFilePath(domain), JSON.stringify(data), { encoding: 'utf-8' });
   } catch (err) {
      console.log('[ERROR] Saving competitor data:', err);
   }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }
   if (req.method === 'POST') {
      return fetchCompetitorKeywords(req, res);
   }
   if (req.method === 'GET') {
      return getSavedCompetitorData(req, res);
   }
   return res.status(502).json({ error: 'Unrecognized Route.' });
}

const getSavedCompetitorData = async (
   req: NextApiRequest,
   res: NextApiResponse<CompetitorsRes>,
) => {
   const domain = req.query.domain as string;
   if (!domain) {
      return res.status(400).json({ data: null, error: 'Domain is required.' });
   }
   const data = await readSavedData(domain);
   return res.status(200).json({ data });
};

const fetchCompetitorKeywords = async (
   req: NextApiRequest,
   res: NextApiResponse<CompetitorsRes>,
) => {
   const { competitorDomain, maxPosition, limit = 100 } = req.body;
   if (!competitorDomain) {
      return res.status(400).json({ data: null, error: 'Competitor domain is required.' });
   }

   try {
      const settings = await getAppSettings();
      const { dataforseo_login, dataforseo_password } = settings;
      if (!dataforseo_login || !dataforseo_password) {
         return res.status(400).json({
            data: null,
            error: 'DataForSEO is not configured. Go to Settings > Integration > DataForSEO.',
         });
      }

      const auth = Buffer.from(`${dataforseo_login}:${dataforseo_password}`).toString('base64');
      const filters = maxPosition
         ? ['ranked_serp_element.serp_item.rank_group', '<=', maxPosition]
         : undefined;

      const body = [{
         target: competitorDomain,
         language_code: 'ja',
         location_code: 2392,
         limit: Math.min(limit, 1000),
         order_by: ['keyword_data.keyword_info.search_volume,desc'],
         ...(filters ? { filters } : {}),
      }];

      const response = await fetch(
         'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live',
         {
            method: 'POST',
            headers: {
               Authorization: `Basic ${auth}`,
               'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
         },
      );

      const json = await response.json();

      if (json.status_code !== 20000) {
         return res.status(400).json({
            data: null,
            error: json.status_message || 'DataForSEO API error.',
         });
      }

      const result = json.tasks?.[0]?.result?.[0];
      if (!result) {
         return res.status(200).json({ data: null, error: 'No results found.' });
      }

      const keywords: CompetitorKeyword[] = (result.items || []).map((item: any) => {
         const kd = item.keyword_data || {};
         const ki = kd.keyword_info || {};
         const si = item.ranked_serp_element?.serp_item || {};
         return {
            keyword: kd.keyword || '',
            position: si.rank_group || 0,
            searchVolume: ki.search_volume || 0,
            url: (si.url || '').replace('https://', '').replace('http://', ''),
         };
      });

      const data: CompetitorData = {
         competitorDomain,
         totalCount: result.total_count || 0,
         keywords,
         fetchedAt: new Date().toJSON(),
      };

      // Save results
      await saveData(competitorDomain, data);

      return res.status(200).json({ data });
   } catch (error) {
      console.log('[ERROR] Fetching competitor keywords:', error);
      return res.status(400).json({ data: null, error: 'Error fetching competitor keywords.' });
   }
};
