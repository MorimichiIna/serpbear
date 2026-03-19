import React, { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { CSSTransition } from 'react-transition-group';
import Sidebar from '../../../../components/common/Sidebar';
import TopBar from '../../../../components/common/TopBar';
import DomainHeader from '../../../../components/domains/DomainHeader';
import AddDomain from '../../../../components/domains/AddDomain';
import DomainSettings from '../../../../components/domains/DomainSettings';
import Settings from '../../../../components/settings/Settings';
import { useFetchDomains } from '../../../../services/domains';
import { useFetchSettings } from '../../../../services/settings';
import { useFetchKeywords } from '../../../../services/keywords';
import URLInspectionTable from '../../../../components/keywords/URLInspectionTable';
import Footer from '../../../../components/common/Footer';
import Icon from '../../../../components/common/Icon';

const IndexingPage: NextPage = () => {
   const router = useRouter();
   const [showDomainSettings, setShowDomainSettings] = useState(false);
   const [showSettings, setShowSettings] = useState(false);
   const [showAddDomain, setShowAddDomain] = useState(false);
   const [inspectionResults, setInspectionResults] = useState<URLInspectionResult[]>([]);
   const [customUrl, setCustomUrl] = useState('');
   const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
   const [loadingSitemap, setLoadingSitemap] = useState(false);
   const [inspecting, setInspecting] = useState(false);
   const [progress, setProgress] = useState({ done: 0, total: 0 });

   const { data: appSettings } = useFetchSettings();
   const { data: domainsData } = useFetchDomains(router);
   const scConnected = !!(appSettings && appSettings?.settings?.search_console_integrated);

   const theDomains: DomainType[] = (domainsData && domainsData.domains) || [];

   const activDomain: DomainType | null = useMemo(() => {
      if (domainsData?.domains && router.query?.slug) {
         return domainsData.domains.find((x: DomainType) => x.slug === router.query.slug) || null;
      }
      return null;
   }, [router.query.slug, domainsData]);

   const domainHasScAPI = useMemo(() => {
      const domainSc = activDomain?.search_console ? JSON.parse(activDomain.search_console) : {};
      return !!(domainSc?.client_email && domainSc?.private_key);
   }, [activDomain]);

   const { keywordsData } = useFetchKeywords(router, activDomain?.domain || '');

   const keywordUrls: string[] = useMemo(() => {
      const kws: KeywordType[] = (keywordsData && keywordsData.keywords) || [];
      const urls = new Set<string>();
      kws.forEach((kw) => {
         if (kw.url) {
            try {
               const parsed = JSON.parse(kw.url as string);
               if (Array.isArray(parsed)) {
                  parsed.forEach((item: any) => {
                     if (item.url) urls.add(item.url);
                  });
               } else if (typeof kw.url === 'string' && kw.url.startsWith('http')) {
                  urls.add(kw.url);
               }
            } catch {
               if (typeof kw.url === 'string' && kw.url.startsWith('http')) {
                  urls.add(kw.url);
               }
            }
         }
      });
      return [...urls];
   }, [keywordsData]);

   // Load saved results on domain change
   useEffect(() => {
      if (!activDomain) return;
      const loadSaved = async () => {
         try {
            const res = await fetch(
               `${window.location.origin}/api/inspect?domain=${activDomain.slug}`,
            );
            const data = await res.json();
            if (data.data && data.data.length > 0) {
               setInspectionResults(data.data);
            }
         } catch { /* ignore */ }
      };
      loadSaved();
   }, [activDomain]);

   const inspectBatch = async (urls: string[], append = false) => {
      if (!activDomain || urls.length === 0) return;
      const batchSize = 5;
      setInspecting(true);
      setProgress({ done: 0, total: urls.length });
      if (!append) setInspectionResults([]);

      for (let i = 0; i < urls.length; i += batchSize) {
         const batch = urls.slice(i, i + batchSize);
         try {
            const res = await fetch(`${window.location.origin}/api/inspect`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ domain: activDomain.slug, urls: batch }),
            });
            if (res.status === 401) { router.push('/login'); return; }
            const data = await res.json();
            if (data.data) {
               setInspectionResults((prev) => [...prev, ...data.data]);
            }
         } catch {
            toast('Error inspecting URLs', { icon: '⚠️' });
         }
         setProgress({ done: Math.min(i + batchSize, urls.length), total: urls.length });
      }
      setInspecting(false);
   };

   const handleInspectAll = () => {
      if (keywordUrls.length === 0) {
         toast('No URLs found for this domain.', { icon: '⚠️' });
         return;
      }
      inspectBatch(keywordUrls);
   };

   const handleLoadSitemap = async () => {
      if (!activDomain) return;
      const url = `https://${activDomain.domain}/sitemap.xml`;
      setLoadingSitemap(true);
      try {
         const res = await fetch(`${window.location.origin}/api/sitemap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sitemapUrl: url }),
         });
         const data = await res.json();
         if (data.urls && data.urls.length > 0) {
            setSitemapUrls(data.urls);
            toast(`${data.urls.length} URLs loaded`, { icon: '✔️' });
         } else {
            toast(data.error || 'No URLs found in sitemap', { icon: '⚠️' });
         }
      } catch {
         toast('Error fetching sitemap', { icon: '⚠️' });
      }
      setLoadingSitemap(false);
   };

   const handleInspectSitemap = () => {
      inspectBatch(sitemapUrls);
   };

   const handleInspectCustomUrl = () => {
      if (!activDomain || !customUrl.trim()) return;
      let url = customUrl.trim();
      if (!url.startsWith('http')) {
         url = `https://${url}`;
      }
      setCustomUrl('');
      inspectBatch([url], true);
   };

   return (
      <div className="Domain ">
         {activDomain && activDomain.domain
            && <Head>
               <title>{`${activDomain.domain} Indexing - SerpBear`}</title>
            </Head>
         }
         <TopBar showSettings={() => setShowSettings(true)} showAddModal={() => setShowAddDomain(true)} />
         <div className="flex w-full max-w-7xl mx-auto">
            <Sidebar domains={theDomains} showAddModal={() => setShowAddDomain(true)} />
            <div className="domain_keywords px-5 pt-10 lg:px-0 lg:pt-8 w-full">
               {activDomain && activDomain.domain
                  ? <DomainHeader
                     domain={activDomain}
                     domains={theDomains}
                     showAddModal={() => setShowAddDomain(true)}
                     showSettingsModal={setShowDomainSettings}
                     exportCsv={() => { }}
                  />
                  : <div className='w-full lg:h-[100px]'></div>
               }

               <div className="bg-white border rounded p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                     <div className="flex gap-2 items-center flex-1">
                        <input
                           type="text"
                           className="border rounded px-3 py-2 text-sm flex-1 max-w-md"
                           placeholder="https://example.com/page"
                           value={customUrl}
                           onChange={(e) => setCustomUrl(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleInspectCustomUrl()}
                        />
                        <button
                           className="px-4 py-2 bg-blue-700 text-white text-sm rounded
                              hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                           onClick={handleInspectCustomUrl}
                           disabled={inspecting || !customUrl.trim()}
                        >
                           Check URL
                        </button>
                     </div>
                     <button
                        className={`px-4 py-2 border border-blue-700 text-blue-700
                           text-sm rounded hover:bg-blue-50 disabled:opacity-50
                           flex items-center gap-2 whitespace-nowrap`}
                        onClick={handleInspectAll}
                        disabled={inspecting || keywordUrls.length === 0}
                     >
                        {inspecting && <Icon type="loading" size={14} />}
                        Tracked URLs ({keywordUrls.length})
                     </button>
                  </div>

                  <div className="border-t pt-3 flex gap-2 items-center">
                     <button
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded
                           hover:bg-gray-700 disabled:opacity-50
                           flex items-center gap-2 whitespace-nowrap"
                        onClick={handleLoadSitemap}
                        disabled={loadingSitemap || !activDomain}
                     >
                        {loadingSitemap && <Icon type="loading" size={14} />}
                        Load Sitemap
                     </button>
                     {sitemapUrls.length > 0 && (
                        <>
                           <span className="text-sm text-gray-500">
                              {sitemapUrls.length} URLs found
                           </span>
                           <button
                              className="px-4 py-2 bg-blue-700 text-white text-sm
                                 rounded hover:bg-blue-800 disabled:opacity-50
                                 flex items-center gap-2 whitespace-nowrap"
                              onClick={handleInspectSitemap}
                              disabled={inspecting}
                           >
                              {inspecting && <Icon type="loading" size={14} />}
                              Check {sitemapUrls.length} URLs
                           </button>
                        </>
                     )}
                  </div>
               </div>

               {inspecting && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                     <Icon type="loading" size={14} />
                     Inspecting... {progress.done} / {progress.total}
                  </div>
               )}

               <URLInspectionTable
                  results={inspectionResults}
                  isLoading={inspecting && inspectionResults.length === 0}
                  domain={activDomain}
                  isConsoleIntegrated={scConnected || domainHasScAPI}
               />
            </div>
         </div>

         <CSSTransition in={showAddDomain} timeout={300} classNames="modal_anim" unmountOnExit mountOnEnter>
            <AddDomain closeModal={() => setShowAddDomain(false)} domains={domainsData?.domains || []} />
         </CSSTransition>
         <CSSTransition in={showDomainSettings} timeout={300} classNames="modal_anim" unmountOnExit mountOnEnter>
            <DomainSettings
               domain={showDomainSettings && theDomains && activDomain && activDomain.domain ? activDomain : false}
               closeModal={setShowDomainSettings}
            />
         </CSSTransition>
         <CSSTransition in={showSettings} timeout={300} classNames="settings_anim" unmountOnExit mountOnEnter>
            <Settings closeSettings={() => setShowSettings(false)} />
         </CSSTransition>
         <Footer currentVersion={appSettings?.settings?.version ? appSettings.settings.version : ''} />
      </div>
   );
};

export default IndexingPage;
