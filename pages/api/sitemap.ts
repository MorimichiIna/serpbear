import type { NextApiRequest, NextApiResponse } from 'next';
import verifyUser from '../../utils/verifyUser';

type SitemapRes = {
   urls: string[],
   error?: string | null,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }
   if (req.method === 'POST') {
      return fetchSitemapURLs(req, res);
   }
   return res.status(502).json({ error: 'Unrecognized Route.' });
}

const fetchSitemapURLs = async (
   req: NextApiRequest,
   res: NextApiResponse<SitemapRes>,
) => {
   const { sitemapUrl } = req.body;
   if (!sitemapUrl) {
      return res.status(400).json({ urls: [], error: 'Sitemap URL is required.' });
   }

   try {
      const response = await fetch(sitemapUrl);
      if (!response.ok) {
         return res.status(400).json({
            urls: [],
            error: `Failed to fetch sitemap: ${response.status}`,
         });
      }
      const xml = await response.text();
      const urls = parseSitemapXML(xml);

      if (urls.length === 0) {
         // Could be a sitemap index, try parsing as index
         const sitemapUrls = parseSitemapIndex(xml);
         if (sitemapUrls.length > 0) {
            const allUrls: string[] = [];
            for (const subSitemapUrl of sitemapUrls) {
               try {
                  const subRes = await fetch(subSitemapUrl);
                  if (subRes.ok) {
                     const subXml = await subRes.text();
                     allUrls.push(...parseSitemapXML(subXml));
                  }
               } catch {
                  // Skip failed sub-sitemaps
               }
            }
            return res.status(200).json({ urls: allUrls });
         }
      }

      return res.status(200).json({ urls });
   } catch (error: any) {
      console.log('[ERROR] Fetching sitemap: ', error);
      return res.status(400).json({
         urls: [],
         error: error.message || 'Error fetching sitemap.',
      });
   }
};

const parseSitemapXML = (xml: string): string[] => {
   const urls: string[] = [];
   const locRegex = /<url>\s*<loc>([^<]+)<\/loc>/g;
   let match = locRegex.exec(xml);
   while (match) {
      urls.push(match[1].trim());
      match = locRegex.exec(xml);
   }
   return urls;
};

const parseSitemapIndex = (xml: string): string[] => {
   const urls: string[] = [];
   const locRegex = /<sitemap>\s*<loc>([^<]+)<\/loc>/g;
   let match = locRegex.exec(xml);
   while (match) {
      urls.push(match[1].trim());
      match = locRegex.exec(xml);
   }
   return urls;
};
