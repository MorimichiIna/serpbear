import type { NextApiRequest, NextApiResponse } from 'next';
import { readFile, writeFile } from 'fs/promises';
import verifyUser from '../../utils/verifyUser';
import { getAppSettings } from './settings';

type AIORes = {
   data: AIOResult[] | null,
   error?: string | null,
}

const getFilePath = (domain: string) => {
   const safe = domain.replaceAll('/', '-').replaceAll('.', '-');
   return `${process.cwd()}/data/AIO_${safe}.json`;
};

const readSavedData = async (domain: string): Promise<AIOResult[]> => {
   try {
      const raw = await readFile(getFilePath(domain), { encoding: 'utf-8' });
      return JSON.parse(raw);
   } catch {
      return [];
   }
};

const saveData = async (domain: string, results: AIOResult[]) => {
   try {
      await writeFile(getFilePath(domain), JSON.stringify(results), { encoding: 'utf-8' });
   } catch (err) {
      console.log('[ERROR] Saving AIO data:', err);
   }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }
   if (req.method === 'POST') {
      return checkAIO(req, res);
   }
   if (req.method === 'GET') {
      return getSavedAIO(req, res);
   }
   return res.status(502).json({ error: 'Unrecognized Route.' });
}

const getSavedAIO = async (req: NextApiRequest, res: NextApiResponse<AIORes>) => {
   const domain = req.query.domain as string;
   if (!domain) {
      return res.status(400).json({ data: null, error: 'Domain is required.' });
   }
   const domainname = domain.replaceAll('-', '.').replaceAll('_', '-');
   const data = await readSavedData(domainname);
   return res.status(200).json({ data });
};

const checkAIO = async (req: NextApiRequest, res: NextApiResponse<AIORes>) => {
   const { domain, keywords } = req.body;
   if (!domain || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ data: null, error: 'Domain and keywords are required.' });
   }

   try {
      const settings = await getAppSettings();
      const { dataforseo_login, dataforseo_password } = settings;
      if (!dataforseo_login || !dataforseo_password) {
         return res.status(400).json({
            data: null,
            error: 'DataForSEO is not configured.',
         });
      }

      const auth = Buffer.from(
         `${dataforseo_login}:${dataforseo_password}`,
      ).toString('base64');

      const domainname = domain.replaceAll('-', '.').replaceAll('_', '-');
      const results: AIOResult[] = [];

      // Process keywords one at a time to avoid rate limits
      for (const kw of keywords) {
         try {
            const body = [{
               keyword: kw,
               location_code: 2392,
               language_code: 'ja',
               load_async_ai_overview: true,
            }];

            const response = await fetch(
               'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
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
            const items = json.tasks?.[0]?.result?.[0]?.items || [];
            const aioItem = items.find((i: any) => i.type === 'ai_overview');

            if (aioItem) {
               const rawRefs = aioItem.references || aioItem.items || [];
               const refs: AIOReference[] = rawRefs
                  .filter((r: any) => r.type === 'ai_overview_reference')
                  .map((r: any) => ({
                     source: r.source || '',
                     domain: r.domain || '',
                     url: r.url || '',
                     title: r.title || '',
                  }));

               const cited = refs.some(
                  (r) => domainname.includes(r.domain) || r.domain.includes(domainname),
               );

               results.push({
                  keyword: kw,
                  hasAIO: true,
                  cited,
                  text: (aioItem.markdown || aioItem.text || '').substring(0, 500),
                  references: refs,
                  checkedAt: new Date().toJSON(),
               });
            } else {
               results.push({
                  keyword: kw,
                  hasAIO: false,
                  cited: false,
                  text: '',
                  references: [],
                  checkedAt: new Date().toJSON(),
               });
            }
         } catch (err) {
            results.push({
               keyword: kw,
               hasAIO: false,
               cited: false,
               text: '',
               references: [],
               checkedAt: new Date().toJSON(),
            });
         }
      }

      // Merge with existing saved data
      const existing = await readSavedData(domainname);
      const merged = new Map<string, AIOResult>();
      existing.forEach((r) => merged.set(r.keyword, r));
      results.forEach((r) => merged.set(r.keyword, r));
      const allResults = [...merged.values()];
      await saveData(domainname, allResults);

      return res.status(200).json({ data: results });
   } catch (error) {
      console.log('[ERROR] AIO check:', error);
      return res.status(400).json({ data: null, error: 'Error checking AIO.' });
   }
};
