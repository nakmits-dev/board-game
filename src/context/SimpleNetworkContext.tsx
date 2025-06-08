import React, { createContext, useContext, ReactNode } from 'react';

// シンプルなネットワークコンテキスト（プレースホルダー）
interface SimpleNetworkContextType {
  // 必要最小限のプロパティのみ
}

const SimpleNetworkContext = createContext<SimpleNetworkContextType | undefined>(undefined);

export const SimpleNetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SimpleNetworkContext.Provider value={{}}>
      {children}
    </SimpleNetworkContext.Provider>
  );
};

export const useSimpleNetwork = (): SimpleNetworkContextType => {
  const context = useContext(SimpleNetworkContext);
  if (context === undefined) {
    throw new Error('useSimpleNetwork must be used within a SimpleNetworkProvider');
  }
  return context;
};