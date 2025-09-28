// context/BibleDatabaseContext.tsx
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { BibleDatabase } from '../services/BibleDatabase';

interface BibleDatabaseContextType {
  bibleDB: BibleDatabase | null;
  currentVersion: string;
  availableVersions: string[];
  switchVersion: (newVersion: string) => Promise<void>;
  isInitializing: boolean;
}

const BibleDatabaseContext = createContext<BibleDatabaseContextType | null>(null);

export const useBibleDB = () => {
  const context = useContext(BibleDatabaseContext);
  if (!context) {
    throw new Error('useBibleDB must be used within a BibleDatabaseProvider');
  }
  return context;
};

interface BibleDatabaseProviderProps {
  children: ReactNode;
}

export const BibleDatabaseProvider: React.FC<BibleDatabaseProviderProps> = ({ children }) => {
  const [bibleDB, setBibleDB] = useState<BibleDatabase | null>(null);
  const [currentVersion, setCurrentVersion] = useState('niv11.sqlite3');
  const [isInitializing, setIsInitializing] = useState(false);

  const availableVersions = ['niv11.sqlite3', 'csb17.sqlite3'];

  // Initialize database on app start
  useEffect(() => {
    const initDatabase = async () => {
      setIsInitializing(true);
      try {
        const db = new BibleDatabase(currentVersion);
        await db.init();
        setBibleDB(db);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initDatabase();
  }, []);

  const switchVersion = useCallback(async (newVersion: string) => {
    if (newVersion === currentVersion) return;

    setIsInitializing(true);
    try {
      // Close current database
      if (bibleDB) {
        await bibleDB.close();
      }

      // Initialize new database
      const newDB = new BibleDatabase(newVersion);
      await newDB.init();
      
      setBibleDB(newDB);
      setCurrentVersion(newVersion);
    } catch (error) {
      console.error('Failed to switch version:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [bibleDB, currentVersion]);

  const value: BibleDatabaseContextType = {
    bibleDB,
    currentVersion,
    availableVersions,
    switchVersion,
    isInitializing,
  };

  return (
    <BibleDatabaseContext.Provider value={value}>
      {children}
    </BibleDatabaseContext.Provider>
  );
};