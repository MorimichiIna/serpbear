import { GoogleAuth } from 'google-auth-library';

const INSPECTION_API_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

type InspectAPISettings = { client_email: string, private_key: string };

type InspectResult = {
   result: URLInspectionResult,
   error?: string,
};

/**
 * Inspects a URL using the Google Search Console URL Inspection API.
 * @param {DomainType} domain - The domain to inspect the URL for.
 * @param {string} url - The URL to inspect.
 * @param {InspectAPISettings} api - The Search Console API credentials.
 * @returns {Promise<InspectResult>}
 */
export const inspectUrl = async (domain: DomainType, url: string, api: InspectAPISettings): Promise<InspectResult> => {
   const emptyResult: URLInspectionResult = {
      inspectionUrl: url,
      indexStatus: '',
      coverageState: '',
      robotsTxtState: '',
      indexingState: '',
      lastCrawlTime: '',
      pageFetchState: '',
      crawledAs: '',
      inspectedAt: new Date().toJSON(),
   };

   if (!api?.private_key || !api?.client_email) {
      return { result: emptyResult, error: 'Search Console API credentials not available.' };
   }

   const defaultSCSettings = { property_type: 'domain', url: '', client_email: '', private_key: '' };
   const domainSettings = domain.search_console ? JSON.parse(domain.search_console) : defaultSCSettings;
   const cleanDomain = domain.domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '');
   const siteUrl = domainSettings.property_type === 'url' && domainSettings.url
      ? domainSettings.url
      : `sc-domain:${cleanDomain}`;

   try {
      const authClient = new GoogleAuth({
         credentials: {
            private_key: api.private_key.replaceAll('\\n', '\n'),
            client_email: api.client_email.trim(),
         },
         scopes: ['https://www.googleapis.com/auth/webmasters'],
      });

      const client = await authClient.getClient();
      const res = await client.request({
         url: INSPECTION_API_URL,
         method: 'POST',
         data: {
            inspectionUrl: url,
            siteUrl,
         },
      });

      const data = res.data as any;
      const indexResult = data?.inspectionResult?.indexStatusResult || {};

      return {
         result: {
            inspectionUrl: url,
            indexStatus: indexResult.verdict || 'UNKNOWN',
            coverageState: indexResult.coverageState || '',
            robotsTxtState: indexResult.robotsTxtState || '',
            indexingState: indexResult.indexingState || '',
            lastCrawlTime: indexResult.lastCrawlTime || '',
            pageFetchState: indexResult.pageFetchState || '',
            crawledAs: indexResult.crawledAs || '',
            inspectedAt: new Date().toJSON(),
         },
      };
   } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || err?.message || 'Unknown error';
      console.log(`[ERROR] URL Inspection API Error for ${url}: `, errorMsg);
      return { result: emptyResult, error: errorMsg };
   }
};

export default inspectUrl;
