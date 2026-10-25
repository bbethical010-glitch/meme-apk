import { useEffect, useState } from 'react';
import type { Meme } from '../types';
import { fetchPackMeme, PACKS, type PackId } from '../monetization/packs';
import { isPackUnlocked } from '../monetization/rewards';
import { MONETIZATION_CHANGED } from '../monetization/events';

export default function RewardPacks({ onUnlock, busy, adFree = false }: { onUnlock: (id: PackId) => Promise<void>; busy: boolean; adFree?: boolean }) {
  const [selected, setSelected] = useState<PackId | null>(null);
  const [meme, setMeme] = useState<Meme | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, refresh] = useState(0);
  useEffect(() => {
    const tick = () => refresh(value => value + 1);
    const timer = window.setInterval(tick, 1000);
    window.addEventListener(MONETIZATION_CHANGED, tick);
    return () => { clearInterval(timer); window.removeEventListener(MONETIZATION_CHANGED, tick); };
  }, []);
  const open = async (id: PackId) => {
    setSelected(id); setLoading(true); setError(''); setMeme(null);
    try { setMeme(await fetchPackMeme(id)); }
    catch { setError('PACK UNAVAILABLE. TRY AGAIN.'); }
    finally { setLoading(false); }
  };
  return <section className="w-full max-w-[500px] mt-4 font-label-md">
    <h3 className="text-secondary-container text-sm mb-2">PACKS · PICK YOUR ENERGY</h3>
    <div className="flex gap-2">
      {PACKS.map(pack => <button key={pack.id} disabled={busy || loading} onClick={() => {
        if (isPackUnlocked(pack.id)) void open(pack.id);
        else void onUnlock(pack.id);
      }} className="flex-1 p-3 bg-surface-container border-2 border-primary-container shadow-[3px_3px_0_#000] text-left disabled:opacity-50">
        <strong className="block text-sm">{pack.name}</strong>
        <span className="text-[11px] text-secondary-container">{isPackUnlocked(pack.id) ? 'OPEN PACK ✓' : adFree ? 'UNLOCK 24H — INCLUDED' : 'UNLOCK 24H — WATCH AD'}</span>
      </button>)}
    </div>
    {selected && <div className="mt-3 p-3 bg-surface-container border-2 border-secondary-container">
      <div className="flex justify-between gap-2 mb-2"><strong>{PACKS.find(p => p.id === selected)?.name}</strong>
        <button onClick={() => { setSelected(null); setMeme(null); }}>CLOSE ✕</button></div>
      {!isPackUnlocked(selected) ? <p>PACK EXPIRED — UNLOCK AGAIN ABOVE</p> : <>
        {loading && <p role="status">LOADING PACK…</p>}
        {error && <p role="status">{error}</p>}
        {meme && <img src={meme.url} alt={meme.title} className="w-full max-h-[360px] object-contain" />}
        <button disabled={loading} onClick={() => void open(selected)} className="mt-3 p-2 bg-secondary-container text-black border-2 border-black">NEXT IN PACK</button>
      </>}
    </div>}
  </section>;
}
