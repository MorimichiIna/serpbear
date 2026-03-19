import React from 'react';
import Icon from '../common/Icon';

type URLInspectionTableProps = {
   results: URLInspectionResult[],
   isLoading: boolean,
   domain: DomainType | null,
   isConsoleIntegrated: boolean,
}

const statusLabel = (status: string): { label: string, color: string } => {
   switch (status) {
      case 'PASS':
         return { label: 'Indexed', color: 'bg-green-100 text-green-700' };
      case 'NEUTRAL':
         return { label: 'Excluded', color: 'bg-yellow-100 text-yellow-700' };
      case 'FAIL':
         return { label: 'Not Indexed', color: 'bg-red-100 text-red-700' };
      case 'VERDICT_UNSPECIFIED':
         return { label: 'Unknown', color: 'bg-gray-100 text-gray-600' };
      default:
         return { label: status || '-', color: 'bg-gray-100 text-gray-600' };
   }
};

const formatDate = (dateStr: string): string => {
   if (!dateStr) return '-';
   try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
   } catch {
      return dateStr;
   }
};

const URLInspectionTable = ({ results, isLoading, domain, isConsoleIntegrated }: URLInspectionTableProps) => {
   if (!isConsoleIntegrated) {
      return (
         <div className="text-center p-10 text-gray-500 mt-4 bg-white border rounded">
            <Icon type="integration" size={30} color="#aaa" />
            <p className="mt-3 text-sm">Google Search Console is not integrated.</p>
            <p className="text-xs text-gray-400 mt-1">Configure Search Console in Domain Settings to use URL Inspection.</p>
         </div>
      );
   }

   if (isLoading) {
      return (
         <div className="text-center p-10 mt-4 bg-white border rounded">
            <Icon type="loading" size={24} color="#364AFF" />
            <p className="mt-3 text-sm text-gray-500">Inspecting URLs...</p>
         </div>
      );
   }

   if (results.length === 0) {
      return (
         <div className="text-center p-10 text-gray-500 mt-4 bg-white border rounded">
            <Icon type="search" size={24} color="#aaa" />
            <p className="mt-3 text-sm">
               {domain ? 'Click "Check Indexing" to inspect URLs for this domain.' : 'Select a domain first.'}
            </p>
         </div>
      );
   }

   return (
      <div className="mt-0 bg-white border rounded overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-[#F8F9FF] text-gray-600 text-xs">
                  <th className="text-left px-4 py-3 font-semibold">URL</th>
                  <th className="text-center px-4 py-3 font-semibold w-28">Status</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Coverage</th>
                  <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell w-24">Robots</th>
                  <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell w-24">Crawled As</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell w-40">Last Crawl</th>
               </tr>
            </thead>
            <tbody>
               {results.map((r) => {
                  const { label, color } = statusLabel(r.indexStatus);
                  return (
                     <tr key={r.inspectionUrl} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 max-w-xs truncate" title={r.inspectionUrl}>
                           {r.inspectionUrl}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${color}`}>
                              {label}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                           {r.coverageState || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs hidden lg:table-cell">
                           {(() => {
                              if (r.robotsTxtState === 'ALLOWED') return <span className="text-green-600">Allowed</span>;
                              if (r.robotsTxtState) return <span className="text-red-600">{r.robotsTxtState}</span>;
                              return '-';
                           })()}
                        </td>
                        <td className="px-4 py-3 text-center text-xs hidden lg:table-cell">
                           {r.crawledAs ? r.crawledAs.toLowerCase() : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                           {formatDate(r.lastCrawlTime)}
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
};

export default URLInspectionTable;
