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
import AIOResultsTable from '../../../../components/aio/AIOResultsTable';
import Footer from '../../../../components/common/Footer';
import Icon from '../../../../components/common/Icon';

const AIOPage: NextPage = () => {
   const router = useRouter();
   const [showDomainSettings, setShowDomainSettings] = useState(false);
   const [showSettings, setShowSettings] = useState(false);
   const [showAddDomain, setShowAddDomain] = useState(false);
   const [customKeywords, setCustomKeywords] = useState('');
   const [aioResults, setAioResults] = useState<AIOResult[]>([]);
   const [checking, setChecking] = useState(false);
   const [progress, setProgress] = useState({ done: 0, total: 0 });

   const { data: appSettings } = useFetchSettings();
   const { data: domainsData } = useFetchDomains(router);
   const theDomains: DomainType[] = (domainsData && domainsData.domains) || [];
   const isConfigured = !!(
      appSettings?.settings?.dataforseo_login
      && appSettings?.settings?.dataforseo_password
   );

   const activDomain: DomainType | null = useMemo(() => {
      if (domainsData?.domains && router.query?.slug) {
         return domainsData.domains.find(
            (x: DomainType) => x.slug === router.query.slug,
         ) || null;
      }
      return null;
   }, [router.query.slug, domainsData]);

   const { keywordsData } = useFetchKeywords(router, activDomain?.domain || '');
   const trackedKeywords: string[] = useMemo(() => {
      const kws: KeywordType[] = (keywordsData && keywordsData.keywords) || [];
      return kws.map((k) => k.keyword);
   }, [keywordsData]);

   // Load saved results
   useEffect(() => {
      if (!activDomain) return;
      const load = async () => {
         try {
            const res = await fetch(
               `${window.location.origin}/api/aio?domain=${activDomain.slug}`,
            );
            const json = await res.json();
            if (json.data && json.data.length > 0) setAioResults(json.data);
         } catch { /* ignore */ }
      };
      load();
   }, [activDomain]);

   const mergeResults = (prev: AIOResult[], newItems: AIOResult[]): AIOResult[] => {
      const map = new Map<string, AIOResult>();
      prev.forEach((r) => map.set(r.keyword, r));
      newItems.forEach((r) => map.set(r.keyword, r));
      return [...map.values()];
   };

   const checkSingleKeyword = async (slug: string, kw: string): Promise<AIOResult[]> => {
      const res = await fetch(`${window.location.origin}/api/aio`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ domain: slug, keywords: [kw] }),
      });
      if (res.status === 401) { router.push('/login'); return []; }
      const json = await res.json();
      return json.data || [];
   };

   const checkKeywords = async (keywords: string[]) => {
      if (!activDomain || keywords.length === 0) return;
      setChecking(true);
      setProgress({ done: 0, total: keywords.length });

      for (let i = 0; i < keywords.length; i += 1) {
         try {
            const items = await checkSingleKeyword(activDomain.slug, keywords[i]);
            if (items.length > 0) {
               setAioResults((prev) => mergeResults(prev, items));
            }
         } catch { /* ignore */ }
         setProgress({ done: i + 1, total: keywords.length });
      }
      setChecking(false);
   };

   const handleCheckCustom = () => {
      const kws = customKeywords
         .split('\n')
         .map((k) => k.trim())
         .filter((k) => k.length > 0);
      if (kws.length === 0) {
         toast('Enter at least one keyword', { icon: '⚠️' });
         return;
      }
      setCustomKeywords('');
      checkKeywords(kws);
   };

   const handleCheckTracked = () => {
      if (trackedKeywords.length === 0) {
         toast('No tracked keywords', { icon: '⚠️' });
         return;
      }
      checkKeywords(trackedKeywords);
   };

   return (
      <div className="Domain ">
         {activDomain && activDomain.domain && (
            <Head>
               <title>{`${activDomain.domain} AIO - SerpBear`}</title>
            </Head>
         )}
         <TopBar
            showSettings={() => setShowSettings(true)}
            showAddModal={() => setShowAddDomain(true)}
         />
         <div className="flex w-full max-w-7xl mx-auto">
            <Sidebar
               domains={theDomains}
               showAddModal={() => setShowAddDomain(true)}
            />
            <div className="domain_keywords px-5 pt-10 lg:px-0 lg:pt-8 w-full">
               {activDomain && activDomain.domain ? (
                  <DomainHeader
                     domain={activDomain}
                     domains={theDomains}
                     showAddModal={() => setShowAddDomain(true)}
                     showSettingsModal={setShowDomainSettings}
                     exportCsv={() => { }}
                  />
               ) : (
                  <div className="w-full lg:h-[100px]" />
               )}

               <div className="bg-white border rounded p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                     <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">
                           Keywords (one per line)
                        </label>
                        <textarea
                           className="border rounded px-3 py-2 text-sm w-full h-20
                              resize-y"
                           placeholder={'UGCとは\nSNSキャンペーン ツール'}
                           value={customKeywords}
                           onChange={(e) => setCustomKeywords(e.target.value)}
                        />
                     </div>
                     <div className="flex flex-col gap-2">
                        <button
                           className="px-4 py-2 bg-blue-700 text-white text-sm
                              rounded hover:bg-blue-800 disabled:opacity-50
                              flex items-center gap-2 whitespace-nowrap"
                           onClick={handleCheckCustom}
                           disabled={checking || !customKeywords.trim()}
                        >
                           {checking && <Icon type="loading" size={14} />}
                           Check Keywords
                        </button>
                        <button
                           className="px-4 py-2 border border-blue-700 text-blue-700
                              text-sm rounded hover:bg-blue-50 disabled:opacity-50
                              flex items-center gap-2 whitespace-nowrap"
                           onClick={handleCheckTracked}
                           disabled={checking || trackedKeywords.length === 0}
                        >
                           Tracked ({trackedKeywords.length})
                        </button>
                     </div>
                  </div>
                  <p className="text-xs text-gray-400">
                     ~$0.004/keyword (with async AI Overview loading)
                  </p>
               </div>

               {checking && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                     <Icon type="loading" size={14} />
                     Checking... {progress.done} / {progress.total}
                  </div>
               )}

               <AIOResultsTable
                  results={aioResults}
                  isLoading={checking && aioResults.length === 0}
                  isConfigured={isConfigured}
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

export default AIOPage;
