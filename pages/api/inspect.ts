import type { NextApiRequest, NextApiResponse } from 'next';
import { readFile, writeFile } from 'fs/promises';
import db from '../../database/database';
import Domain from '../../database/models/domain';
import { getSearchConsoleApiInfo } from '../../utils/searchConsole';
import { inspectUrl } from '../../utils/urlInspection';
import verifyUser from '../../utils/verifyUser';

type InspectRes = {
   data: URLInspectionResult[],
   error?: string | null,
}

const getFilePath = (domain: string) => {
   const safe = domain.replaceAll('/', '-');
   return `${process.cwd()}/data/INSPECT_${safe}.json`;
};

const readInspectionData = async (
   domain: string,
): Promise<URLInspectionResult[]> => {
   try {
      const raw = await readFile(getFilePath(domain), { encoding: 'utf-8' });
      return JSON.parse(raw);
   } catch {
      return [];
   }
};

const saveInspectionData = async (
   domain: string,
   results: URLInspectionResult[],
) => {
   try {
      await writeFile(
         getFilePath(domain),
         JSON.stringify(results),
         { encoding: 'utf-8' },
      );
   } catch (err) {
      console.log('[ERROR] Saving inspection data:', err);
   }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await db.sync();
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }
   if (req.method === 'POST') {
      return inspectURLs(req, res);
   }
   if (req.method === 'GET') {
      return getInspectionData(req, res);
   }
   return res.status(502).json({ error: 'Unrecognized Route.' });
}

const getInspectionData = async (
   req: NextApiRequest,
   res: NextApiResponse<InspectRes>,
) => {
   const domain = req.query.domain as string;
   if (!domain) {
      return res.status(400).json({ data: [], error: 'Domain is required.' });
   }
   const domainname = domain.replaceAll('-', '.').replaceAll('_', '-');
   const data = await readInspectionData(domainname);
   return res.status(200).json({ data });
};

const inspectURLs = async (req: NextApiRequest, res: NextApiResponse<InspectRes>) => {
   const { domain, urls } = req.body;
   if (!domain || !urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ data: [], error: 'Domain and URLs are required.' });
   }
   if (urls.length > 50) {
      return res.status(400).json({ data: [], error: 'Maximum 50 URLs per request.' });
   }

   try {
      const domainname = (domain as string).replaceAll('-', '.').replaceAll('_', '-');
      const query = { domain: domainname };
      const foundDomain: Domain | null = await Domain.findOne({ where: query });
      if (!foundDomain) {
         return res.status(404).json({ data: [], error: 'Domain not found.' });
      }
      const domainObj: DomainType = foundDomain.get({ plain: true });
      const scAPI = await getSearchConsoleApiInfo(domainObj);

      if (!scAPI.client_email || !scAPI.private_key) {
         return res.status(400).json({ data: [], error: 'Google Search Console is not integrated.' });
      }

      const results: URLInspectionResult[] = [];
      const errors: string[] = [];
      const batchSize = 5;

      for (let i = 0; i < urls.length; i += batchSize) {
         const batch = urls.slice(i, i + batchSize);
         const batchResults = await Promise.all(
            batch.map((url: string) => inspectUrl(domainObj, url, scAPI)),
         );
         batchResults.forEach(({ result, error }) => {
            results.push(result);
            if (error) errors.push(`${result.inspectionUrl}: ${error}`);
         });
      }

      // Merge with existing saved data (update existing URLs, append new)
      const existing = await readInspectionData(domainname);
      const merged = new Map<string, URLInspectionResult>();
      existing.forEach((r) => merged.set(r.inspectionUrl, r));
      results.forEach((r) => merged.set(r.inspectionUrl, r));
      await saveInspectionData(domainname, [...merged.values()]);

      return res.status(200).json({
         data: results,
         error: errors.length > 0 ? errors.join('; ') : null,
      });
   } catch (error) {
      console.log('[ERROR] URL Inspection: ', error);
      return res.status(400).json({ data: [], error: 'Error inspecting URLs.' });
   }
};
