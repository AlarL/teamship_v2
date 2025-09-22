import { KokimokiStore } from '@kokimoki/app';
import { kmClient } from '@/services/km-client';
import { getInitialLobbyState, type LobbyState } from '@/state/stores/lobby-store';
import { LEGENDS } from '@/types/teamship';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';

type Entry = {
  code: string;
  store: KokimokiStore<LobbyState>;
  joined: boolean;
};

const SpectatorView = () => {
  const [codes, setCodes] = useState<string>('');
  const [entries, setEntries] = useState<Entry[]>([]);

  const addCodes = async () => {
    const items = codes
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const uniques = Array.from(new Set(items));
    const newEntries: Entry[] = uniques.map((code) => ({
      code,
      store: kmClient.store(code, getInitialLobbyState(), false),
      joined: false
    }));
    setEntries(newEntries);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      for (const e of entries) {
        if (!e.joined) {
          try {
            await kmClient.join(e.store);
            if (!mounted) return;
            e.joined = true;
          } catch {}
        }
      }
    })();
    return () => {
      mounted = false;
      for (const e of entries) kmClient.leave(e.store).catch(() => {});
    };
  }, [entries]);

  const snapshots = entries.map((e) => ({ code: e.code, snap: useSnapshot(e.store.proxy) }));
  const rows = useMemo(() => {
    return snapshots.map(({ code, snap }) => {
      const ship = snap.ship;
      const legend = LEGENDS[ship.legendId];
      const progress = Math.max(0, 100 - Math.round((ship.distanceRemaining / legend.targetDistance) * 100));
      return { code, progress, phase: ship.phase, speed: ship.speed };
    }).sort((a, b) => b.progress - a.progress);
  }, [snapshots]);

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="mx-auto max-w-screen-sm space-y-4">
        <div className="flex gap-2">
          <input className="input input-bordered flex-1" placeholder="ABC-123, XYZ-456" value={codes} onChange={(e) => setCodes(e.target.value)} />
          <button className="btn btn-primary" onClick={addCodes}>Track</button>
        </div>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.code} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-semibold">{r.code}</div>
                  <div className="opacity-70">{r.phase}</div>
                </div>
                <progress className="progress progress-primary w-full" value={r.progress} max={100}></progress>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpectatorView;

