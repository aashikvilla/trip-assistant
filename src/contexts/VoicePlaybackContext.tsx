import React, { createContext, useContext, useState } from 'react';

interface VoicePlaybackContextValue {
  activeMessageId: string | null;
  setActiveMessageId: (id: string | null) => void;
}

const VoicePlaybackContext = createContext<VoicePlaybackContextValue>({
  activeMessageId: null,
  setActiveMessageId: () => {},
});

export const VoicePlaybackProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  return (
    <VoicePlaybackContext.Provider value={{ activeMessageId, setActiveMessageId }}>
      {children}
    </VoicePlaybackContext.Provider>
  );
};

export const useVoicePlaybackContext = () => useContext(VoicePlaybackContext);
