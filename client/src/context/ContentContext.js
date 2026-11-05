import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { siteService } from '../services/siteService';
import { BUSINESS_EMAIL, BUSINESS_PHONE } from '../utils/constants';
import { DEFAULT_CONTENT, mergeContent } from '../utils/contentSchema';

const ContentContext = createContext(null);

const DEFAULT_SETTINGS = { deliveryMethods: [], payments: {}, logo: null };

export function ContentProvider({ children }) {
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    return siteService
      .getContent()
      .then((content) => {
        setSaved(content || {});
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const mergedContent = mergeContent(DEFAULT_CONTENT, saved);
    const content = {
      ...mergedContent,
      contact: {
        ...mergedContent.contact,
        phone: String(mergedContent.contact.phone || '').trim() || BUSINESS_PHONE,
        email: String(mergedContent.contact.email || '').trim() || BUSINESS_EMAIL,
      },
    };
    return {
      content,
      settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
      loading,
      error,
      refresh,
    };
  }, [saved, loading, error, refresh]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(section) {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside ContentProvider');
  return section ? context.content[section] : context;
}
