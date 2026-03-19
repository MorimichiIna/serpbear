import React from 'react';
import SecretField from '../common/SecretField';

type DataForSEOSettingsProps = {
   settings: SettingsType,
   updateSettings: Function,
}

const DataForSEOSettings = ({ settings, updateSettings }: DataForSEOSettingsProps) => {
   const { dataforseo_login = '', dataforseo_password = '' } = settings || {};

   return (
      <div>
         <div className="settings__section__input mb-4 flex justify-between items-center w-full">
            <SecretField
               label='API Login (Email)'
               onChange={(val: string) => updateSettings('dataforseo_login', val)}
               value={dataforseo_login}
               placeholder='your@email.com'
            />
         </div>
         <div className="settings__section__input mb-4 flex justify-between items-center w-full">
            <SecretField
               label='API Password'
               onChange={(val: string) => updateSettings('dataforseo_password', val)}
               value={dataforseo_password}
               placeholder='1145'
            />
         </div>
         <p className='mb-4 text-xs text-gray-500'>
            Get your API credentials from{' '}
            <a
               target='_blank'
               rel='noreferrer'
               href='https://app.dataforseo.com/api-access'
               className='underline text-blue-600'
            >
               DataForSEO Dashboard
            </a>.
         </p>
      </div>
   );
};

export default DataForSEOSettings;
