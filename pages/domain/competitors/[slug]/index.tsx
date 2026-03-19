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
import { useFetchCompetitorKeywords } from '../../../../services/competitors';
import CompetitorKeywordsTable from '../../../../components/competitors/CompetitorKeywordsTable';
import Footer from '../../../../components/common/Footer';
import Icon from '../../../../components/common/Icon';

const CompetitorsPage: NextPage = () => {
   const router = useRouter();
   const [showDomainSettings, setShowDomainSettings] = useState(false);
   const [showSettings, setShowSettings] = useState(false);
   const [showAddDomain, setShowAddDomain] = useState(false);
   const [competitorDomain, setCompetitorDomain] = useState('');
   const [maxPosition, setMaxPosition] = useState<string>('10');
   const [resultLimit, setResultLimit] = useState<string>('100');
   const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
   const [savedDomains, setSavedDomains] = useState<string[]>([]);
   const [selectedDomain, setSelectedDomain] = useState<string>('');

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

   // Load saved competitor domain list on mount
   useEffect(() => {
      const loadList = async () => {
         try {
            const res = await fetch(
               `${window.location.origin}/api/competitors`,
            );
            const json = await res.json();
            if (json.domains) setSavedDomains(json.domains);
         } catch { /* ignore */ }
      };
      loadList();
   }, []);

   // Load saved data when a saved domain is selected
   const handleSelectSaved = async (domain: string) => {
      setSelectedDomain(domain);
      setCompetitorDomain(domain);
      try {
         const res = await fetch(
            `${window.location.origin}/api/competitors?domain=${domain}`,
         );
         const json = await res.json();
         if (json.data) setCompetitorData(json.data);
      } catch {
         toast('Error loading saved data', { icon: '⚠️' });
      }
   };

   const {
      mutate: fetchKeywords,
      isLoading: fetching,
   } = useFetchCompetitorKeywords(router);

   const handleFetch = () => {
      if (!competitorDomain.trim()) return;
      const domain = competitorDomain.trim()
         .replace(/^https?:\/\//, '')
         .replace(/\/.*$/, '');
      setCompetitorDomain(domain);
      setSelectedDomain(domain);

      fetchKeywords(
         {
            competitorDomain: domain,
            maxPosition: maxPosition ? parseInt(maxPosition, 10) : undefined,
            limit: resultLimit ? parseInt(resultLimit, 10) : 100,
         },
         {
            onSuccess: (res) => {
               if (res.data) {
                  setCompetitorData(res.data);
                  toast(
                     `${res.data.keywords.length} keywords fetched`,
                     { icon: '✔️' },
                  );
                  // Update saved domains list
                  if (!savedDomains.includes(domain)) {
                     setSavedDomains((prev) => [...prev, domain]);
                  }
               }
               if (res.error) {
                  toast(res.error.substring(0, 100), { icon: '⚠️' });
               }
            },
            onError: (err: any) => {
               toast(err.message || 'Error', { icon: '⚠️' });
            },
         },
      );
   };

   return (
      <div className="Domain ">
         {activDomain && activDomain.domain && (
            <Head>
               <title>{`${activDomain.domain} Competitors - SerpBear`}</title>
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
                  {savedDomains.length > 0 && (
                     <div className="flex gap-2 items-center flex-wrap">
                        <span className="text-xs text-gray-500">Saved:</span>
                        {savedDomains.map((d) => (
                           <button
                              key={d}
                              className={`px-3 py-1 text-xs rounded-full border
                                 ${selectedDomain === d
                                    ? 'bg-blue-700 text-white border-blue-700'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                 }`}
                              onClick={() => handleSelectSaved(d)}
                           >
                              {d}
                           </button>
                        ))}
                     </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                     <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">
                           Competitor Domain
                        </label>
                        <input
                           type="text"
                           className="border rounded px-3 py-2 text-sm w-full"
                           placeholder="competitor.com"
                           value={competitorDomain}
                           onChange={(e) => setCompetitorDomain(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                        />
                     </div>
                     <div className="w-24">
                        <label className="text-xs text-gray-500 mb-1 block">
                           Max Pos
                        </label>
                        <input
                           type="number"
                           className="border rounded px-3 py-2 text-sm w-full"
                           placeholder="10"
                           value={maxPosition}
                           onChange={(e) => setMaxPosition(e.target.value)}
                        />
                     </div>
                     <div className="w-24">
                        <label className="text-xs text-gray-500 mb-1 block">
                           Limit
                        </label>
                        <input
                           type="number"
                           className="border rounded px-3 py-2 text-sm w-full"
                           placeholder="100"
                           value={resultLimit}
                           onChange={(e) => setResultLimit(e.target.value)}
                        />
                     </div>
                     <button
                        className="px-6 py-2 bg-blue-700 text-white text-sm rounded
                           hover:bg-blue-800 disabled:opacity-50
                           flex items-center gap-2 whitespace-nowrap"
                        onClick={handleFetch}
                        disabled={fetching || !competitorDomain.trim()}
                     >
                        {fetching && <Icon type="loading" size={14} />}
                        Fetch
                     </button>
                  </div>
               </div>

               <CompetitorKeywordsTable
                  data={competitorData}
                  isLoading={fetching}
                  isConfigured={isConfigured}
               />
            </div>
         </div>

         <CSSTransition
            in={showAddDomain}
            timeout={300}
            classNames="modal_anim"
            unmountOnExit
            mountOnEnter
         >
            <AddDomain
               closeModal={() => setShowAddDomain(false)}
               domains={domainsData?.domains || []}
            />
         </CSSTransition>
         <CSSTransition
            in={showDomainSettings}
            timeout={300}
            classNames="modal_anim"
            unmountOnExit
            mountOnEnter
         >
            <DomainSettings
               domain={
                  showDomainSettings && theDomains && activDomain
                  && activDomain.domain
                     ? activDomain
                     : false
               }
               closeModal={setShowDomainSettings}
            />
         </CSSTransition>
         <CSSTransition
            in={showSettings}
            timeout={300}
            classNames="settings_anim"
            unmountOnExit
            mountOnEnter
         >
            <Settings closeSettings={() => setShowSettings(false)} />
         </CSSTransition>
         <Footer
            currentVersion={
               appSettings?.settings?.version
                  ? appSettings.settings.version
                  : ''
            }
         />
      </div>
   );
};

export default CompetitorsPage;
