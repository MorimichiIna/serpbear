import React, { useMemo, useState } from 'react';
import Icon from '../common/Icon';

type CompetitorKeywordsTableProps = {
   data: CompetitorData | null,
   isLoading: boolean,
   isConfigured: boolean,
}

type SortKey = 'keyword' | 'position' | 'searchVolume';
type SortDir = 'asc' | 'desc';

const CompetitorKeywordsTable = (
   { data, isLoading, isConfigured }: CompetitorKeywordsTableProps,
) => {
   const [search, setSearch] = useState('');
   const [sortKey, setSortKey] = useState<SortKey>('searchVolume');
   const [sortDir, setSortDir] = useState<SortDir>('desc');

   const toggleSort = (key: SortKey) => {
      if (sortKey === key) {
         setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
         setSortKey(key);
         setSortDir(key === 'keyword' ? 'asc' : 'desc');
      }
   };

   const sortIcon = (key: SortKey) => {
      if (sortKey !== key) return '';
      return sortDir === 'asc' ? ' ▲' : ' ▼';
   };

   const filtered = useMemo(() => {
      if (!data?.keywords) return [];
      let kws = data.keywords;
      if (search) {
         const q = search.toLowerCase();
         kws = kws.filter((k) => k.keyword.toLowerCase().includes(q)
            || k.url.toLowerCase().includes(q));
      }
      kws = [...kws].sort((a, b) => {
         const aVal = a[sortKey];
         const bVal = b[sortKey];
         if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDir === 'asc'
               ? aVal.localeCompare(bVal)
               : bVal.localeCompare(aVal);
         }
         return sortDir === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
      });
      return kws;
   }, [data, search, sortKey, sortDir]);

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

   if (isLoading) {
      return (
         <div className="text-center p-10 mt-4 bg-white border rounded">
            <Icon type="loading" size={24} color="#364AFF" />
            <p className="mt-3 text-sm text-gray-500">Fetching keywords...</p>
         </div>
      );
   }

   if (!data || !data.keywords || data.keywords.length === 0) {
      return (
         <div className="text-center p-10 text-gray-500 mt-4 bg-white border rounded">
            <Icon type="search" size={24} color="#aaa" />
            <p className="mt-3 text-sm">
               Enter a competitor domain and click Fetch.
            </p>
         </div>
      );
   }

   const thStyle = 'px-4 py-3 font-semibold cursor-pointer select-none';

   return (
      <div className="mt-0">
         <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">
               {data.totalCount.toLocaleString()} keywords total
               {' / '}showing {filtered.length.toLocaleString()}
               {data.fetchedAt && (
                  <span className="ml-2">
                     (fetched: {new Date(data.fetchedAt).toLocaleDateString('ja-JP')})
                  </span>
               )}
            </div>
            <input
               type="text"
               className="border rounded px-3 py-1 text-sm w-60"
               placeholder="Filter keywords..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="bg-white border rounded overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
               <thead className="sticky top-0 z-10">
                  <tr className="bg-[#F8F9FF] text-gray-600 text-xs">
                     <th
                        className={`text-left ${thStyle}`}
                        onClick={() => toggleSort('keyword')}
                     >
                        Keyword{sortIcon('keyword')}
                     </th>
                     <th
                        className={`text-center ${thStyle} w-24`}
                        onClick={() => toggleSort('searchVolume')}
                     >
                        Volume{sortIcon('searchVolume')}
                     </th>
                     <th
                        className={`text-center ${thStyle} w-20`}
                        onClick={() => toggleSort('position')}
                     >
                        Pos{sortIcon('position')}
                     </th>
                     <th className="text-left px-4 py-3 font-semibold">URL</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.map((kw) => (
                     <tr key={`${kw.keyword}-${kw.position}`} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{kw.keyword}</td>
                        <td className="px-4 py-2 text-center">
                           {kw.searchVolume.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                           <span className={(() => {
                              if (kw.position <= 3) return 'text-green-600 font-semibold';
                              if (kw.position <= 10) return 'text-blue-600';
                              return '';
                           })()}>
                              {kw.position}
                           </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                           {kw.url}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default CompetitorKeywordsTable;
