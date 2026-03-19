import React, { useState } from 'react';
import Icon from '../common/Icon';

type AIOResultsTableProps = {
   results: AIOResult[],
   isLoading: boolean,
   isConfigured: boolean,
}

const AIOResultsTable = ({ results, isLoading, isConfigured }: AIOResultsTableProps) => {
   const [expandedKw, setExpandedKw] = useState<string>('');

   if (!isConfigured) {
      return (
         <div className="text-center p-10 text-gray-500 mt-4 bg-white border rounded">
            <Icon type="integration" size={30} color="#aaa" />
            <p className="mt-3 text-sm">DataForSEO is not configured.</p>
            <p className="text-xs text-gray-400 mt-1">
               Go to Settings &gt; Integration &gt; DataForSEO.
            </p>
         </div>
      );
   }

   if (isLoading && results.length === 0) {
      return (
         <div className="text-center p-10 mt-4 bg-white border rounded">
            <Icon type="loading" size={24} color="#364AFF" />
            <p className="mt-3 text-sm text-gray-500">Checking AI Overview...</p>
         </div>
      );
   }

   if (results.length === 0) {
      return (
         <div className="text-center p-10 text-gray-500 mt-4 bg-white border rounded">
            <Icon type="search" size={24} color="#aaa" />
            <p className="mt-3 text-sm">
               Enter keywords and click Check to see AI Overview status.
            </p>
         </div>
      );
   }

   const aioCount = results.filter((r) => r.hasAIO).length;
   const citedCount = results.filter((r) => r.cited).length;

   return (
      <div className="mt-0">
         <div className="flex gap-4 mb-2 text-xs text-gray-500">
            <span>{results.length} keywords checked</span>
            <span>{aioCount} with AI Overview</span>
            <span className="text-green-600 font-semibold">
               {citedCount} citing your site
            </span>
         </div>
         <div className="bg-white border rounded overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-[#F8F9FF] text-gray-600 text-xs">
                     <th className="text-left px-4 py-3 font-semibold">Keyword</th>
                     <th className="text-center px-4 py-3 font-semibold w-28">
                        AI Overview
                     </th>
                     <th className="text-center px-4 py-3 font-semibold w-28">
                        Your Site Cited
                     </th>
                     <th className="text-center px-4 py-3 font-semibold w-24 hidden md:table-cell">
                        Sources
                     </th>
                     <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">
                        Checked
                     </th>
                  </tr>
               </thead>
               <tbody>
                  {results.map((r) => (
                     <React.Fragment key={r.keyword}>
                        <tr
                           className="border-t hover:bg-gray-50 cursor-pointer"
                           onClick={() => setExpandedKw(expandedKw === r.keyword ? '' : r.keyword)}
                        >
                           <td className="px-4 py-2">{r.keyword}</td>
                           <td className="px-4 py-2 text-center">
                              {r.hasAIO ? (
                                 <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                    Yes
                                 </span>
                              ) : (
                                 <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                                    No
                                 </span>
                              )}
                           </td>
                           <td className="px-4 py-2 text-center">
                              {(() => {
                                 if (!r.hasAIO) return <span className="text-gray-400 text-xs">-</span>;
                                 if (r.cited) {
                                    return (
                                       <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                          Cited
                                       </span>
                                    );
                                 }
                                 return (
                                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                                       Not Cited
                                    </span>
                                 );
                              })()}
                           </td>
                           <td className="px-4 py-2 text-center hidden md:table-cell text-xs text-gray-500">
                              {r.references.length || '-'}
                           </td>
                           <td className="px-4 py-2 text-xs text-gray-400 hidden lg:table-cell">
                              {r.checkedAt
                                 ? new Date(r.checkedAt).toLocaleDateString('ja-JP')
                                 : '-'}
                           </td>
                        </tr>
                        {expandedKw === r.keyword && r.hasAIO && (
                           <tr className="border-t bg-gray-50">
                              <td colSpan={5} className="px-4 py-3">
                                 {r.text && (
                                    <div className="mb-3 text-xs text-gray-600 leading-5">
                                       {r.text}
                                    </div>
                                 )}
                                 {r.references.length > 0 && (
                                    <div>
                                       <p className="text-xs font-semibold text-gray-500 mb-1">
                                          References:
                                       </p>
                                       <ul className="text-xs space-y-1">
                                          {r.references.map((ref, i) => (
                                             <li key={`${ref.domain}-${i}`} className="flex gap-2">
                                                <span className="text-gray-400 w-4">{i + 1}.</span>
                                                <span className="font-medium">{ref.source || ref.domain}</span>
                                                <span className="text-gray-400 truncate">{ref.domain}</span>
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 )}
                              </td>
                           </tr>
                        )}
                     </React.Fragment>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default AIOResultsTable;
