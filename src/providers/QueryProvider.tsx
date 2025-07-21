'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (remplace cacheTime)
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // 🎯 IMPORTANT : Le cache fonctionne PENDANT la session
        // mais se vide au rafraîchissement de page (comportement normal)
        
        // 💡 Pour persister le cache entre les rafraîchissements :
        // Décommentez ces lignes et installez @tanstack/react-query-persist-client
        
        // persister: persister, // Voir configuration ci-dessous
        // staleTime: Infinity, // Les données ne deviennent jamais "stale"
        // gcTime: Infinity, // Les données ne sont jamais supprimées du cache
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 🔍 ASTUCE : Ouvrez les DevTools pour voir le cache en action ! */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// 💾 CONFIGURATION OPTIMISÉE POUR POKÉDEX (~600KB de données) :
/*
1️⃣ Installation : 
bun add @tanstack/react-query-persist-client

2️⃣ Configuration Performance :

import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// ✅ OPTION 1 : IndexedDB (RECOMMANDÉE pour 600KB+)
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

const indexedDBPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
  throttleTime: 2000, // 🚀 Limite les écritures à 1 fois/2sec
  buster: 'pokemon-v1', // 🔄 Version cache (change pour invalider)
})

// ✅ OPTION 2 : localStorage (OK pour <1MB, SYNCHRONE)
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  throttleTime: 1000, // 🚀 Limite les écritures
  key: 'POKEMON_CACHE',
})

// 🎯 Persistance configurée :
persistQueryClient({
  queryClient,
  persister: indexedDBPersister, // ou localStoragePersister
  maxAge: 24 * 60 * 60 * 1000,  // 24h de cache
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // 🎯 OPTIMISATION : Ne persiste que les requêtes importantes
      return query.queryKey[0] === 'pokemon' // Seulement les Pokémon
    },
  },
})

3️⃣ Stratégies Performance :

// ⚡ LAZY LOADING : Ne charge que les Pokémon visibles
const { data: pokemonListData } = usePokemonList(20, offset) // Pages de 20

// 🎯 SELECTIVE PERSISTENCE : Persiste seulement les données critiques  
queries: {
  staleTime: 60 * 60 * 1000, // 1 heure pour Pokédex (données statiques)
  gcTime: 24 * 60 * 60 * 1000, // 24h de rétention
}
*/

// 📊 MÉTRIQUES PERFORMANCE ATTENDUES :
/*
Sans persistance :
- Démarrage : 151 requêtes HTTP (~3-5 secondes)
- RAM : ~600KB
- Storage : 0KB

Avec persistance (IndexedDB) :
- Premier démarrage : 151 requêtes HTTP + sauvegarde (~4-6 secondes)
- Démarrages suivants : Lecture cache (~200-500ms)
- RAM : ~1.2MB (temporaire lors sync)
- Storage : ~600KB

ROI : Excellente si >2 visites/jour par utilisateur
*/