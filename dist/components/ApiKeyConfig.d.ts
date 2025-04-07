import React from 'react';
interface ApiKeyConfigProps {
    onKeysConfigured: (keysReady: boolean) => void;
}
declare const ApiKeyConfig: React.FC<ApiKeyConfigProps>;
export default ApiKeyConfig;
